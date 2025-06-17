#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use reqwest;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct RequestHeader {
	key: String,
	value: String,
	enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct QueryParam {
	key: String,
	value: String,
	enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct RequestBody {
	#[serde(rename = "type")]
	body_type: String,
	content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct BasicAuth {
	username: String,
	password: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ApiKey {
	key: String,
	value: String,
	#[serde(rename = "in")]
	location: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Auth {
	#[serde(rename = "type")]
	auth_type: String,
	#[serde(rename = "bearerToken")]
	bearer_token: Option<String>,
	#[serde(rename = "basicAuth")]
	basic_auth: Option<BasicAuth>,
	#[serde(rename = "apiKey")]
	api_key: Option<ApiKey>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ApiRequest {
	id: String,
	name: String,
	method: String,
	url: String,
	headers: Vec<RequestHeader>,
	#[serde(rename = "queryParams")]
	query_params: Vec<QueryParam>,
	body: Option<RequestBody>,
	auth: Option<Auth>,
	#[serde(rename = "createdAt")]
	created_at: String,
	#[serde(rename = "updatedAt")]
	updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Collection {
	id: String,
	name: String,
	description: Option<String>,
	requests: Vec<ApiRequest>,
	variables: Option<HashMap<String, String>>,
	#[serde(rename = "createdAt")]
	created_at: String,
	#[serde(rename = "updatedAt")]
	updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ApiResponse {
	status: u16,
	#[serde(rename = "statusText")]
	status_text: String,
	headers: HashMap<String, String>,
	data: serde_json::Value,
	#[serde(rename = "responseTime")]
	response_time: u64,
	size: u64,
	timestamp: String,
}

fn get_collections_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
	let app_data_dir = app_handle.path().app_data_dir()
		.map_err(|e| format!("Failed to get app data directory: {}", e))?;
	
	let collections_dir = app_data_dir.join("simple-request").join("collections");
	
	if !collections_dir.exists() {
		fs::create_dir_all(&collections_dir)
			.map_err(|e| format!("Failed to create collections directory: {}", e))?;
	}
	
	Ok(collections_dir)
}

#[tauri::command]
async fn load_collections(app_handle: AppHandle) -> Result<Vec<Collection>, String> {
	let collections_dir = get_collections_dir(&app_handle)?;
	let mut collections = Vec::new();
	
	if let Ok(entries) = fs::read_dir(collections_dir) {
		for entry in entries {
			if let Ok(entry) = entry {
				let path = entry.path();
				if path.extension().and_then(|s| s.to_str()) == Some("json") {
					if let Ok(content) = fs::read_to_string(&path) {
						if let Ok(collection) = serde_json::from_str::<Collection>(&content) {
							collections.push(collection);
						}
					}
				}
			}
		}
	}
	
	collections.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
	
	Ok(collections)
}

#[tauri::command]
async fn save_collection(app_handle: AppHandle, collection: Collection) -> Result<(), String> {
	let collections_dir = get_collections_dir(&app_handle)?;
	let file_path = collections_dir.join(format!("{}.json", collection.id));
	
	let json_content = serde_json::to_string_pretty(&collection)
		.map_err(|e| format!("Failed to serialize collection: {}", e))?;
	
	fs::write(file_path, json_content)
		.map_err(|e| format!("Failed to write collection file: {}", e))?;
	
	Ok(())
}

#[tauri::command]
async fn delete_collection(app_handle: AppHandle, collection_id: String) -> Result<(), String> {
	let collections_dir = get_collections_dir(&app_handle)?;
	let file_path = collections_dir.join(format!("{}.json", collection_id));
	
	if file_path.exists() {
		fs::remove_file(file_path)
			.map_err(|e| format!("Failed to delete collection: {}", e))?;
	}
	
	Ok(())
}

#[tauri::command]
async fn execute_request(request: ApiRequest) -> Result<ApiResponse, String> {
	let client = reqwest::Client::new();
	let start_time = std::time::Instant::now();
	
	let mut url = reqwest::Url::parse(&request.url)
		.map_err(|e| format!("Invalid URL: {}", e))?;
	
	for param in &request.query_params {
		if param.enabled && !param.key.is_empty() {
			url.query_pairs_mut().append_pair(&param.key, &param.value);
		}
	}
	
	let method = match request.method.as_str() {
		"GET" => reqwest::Method::GET,
		"POST" => reqwest::Method::POST,
		"PUT" => reqwest::Method::PUT,
		"DELETE" => reqwest::Method::DELETE,
		"PATCH" => reqwest::Method::PATCH,
		"HEAD" => reqwest::Method::HEAD,
		"OPTIONS" => reqwest::Method::OPTIONS,
		_ => return Err("Unsupported HTTP method".to_string()),
	};
	
	let mut req_builder = client.request(method, url);
	
	for header in &request.headers {
		if header.enabled && !header.key.is_empty() {
			req_builder = req_builder.header(&header.key, &header.value);
		}
	}
	
	if let Some(auth) = &request.auth {
		match auth.auth_type.as_str() {
			"bearer" => {
				if let Some(token) = &auth.bearer_token {
					req_builder = req_builder.header("Authorization", format!("Bearer {}", token));
				}
			}
			"basic" => {
				if let Some(basic) = &auth.basic_auth {
					req_builder = req_builder.basic_auth(&basic.username, Some(&basic.password));
				}
			}
			"api-key" => {
				if let Some(api_key) = &auth.api_key {
					if api_key.location == "header" {
						req_builder = req_builder.header(&api_key.key, &api_key.value);
					}
				}
			}
			_ => {}
		}
	}
	
	if let Some(body) = &request.body {
		match body.body_type.as_str() {
			"json" => {
				req_builder = req_builder
					.header("Content-Type", "application/json")
					.body(body.content.clone());
			}
			"raw" => {
				req_builder = req_builder.body(body.content.clone());
			}
			"x-www-form-urlencoded" => {
				req_builder = req_builder
					.header("Content-Type", "application/x-www-form-urlencoded")
					.body(body.content.clone());
			}
			_ => {}
		}
	}
	
	let response = req_builder.send().await
		.map_err(|e| format!("Request failed: {}", e))?;
	
	let elapsed = start_time.elapsed();
	let status = response.status();
	let status_text = status.canonical_reason().unwrap_or("Unknown").to_string();
	
	let mut headers = HashMap::new();
	for (key, value) in response.headers() {
		if let Ok(value_str) = value.to_str() {
			headers.insert(key.to_string(), value_str.to_string());
		}
	}
	
	let response_bytes = response.bytes().await
		.map_err(|e| format!("Failed to read response body: {}", e))?;
	
	let size = response_bytes.len() as u64;
	
	let data = if let Ok(json_value) = serde_json::from_slice::<serde_json::Value>(&response_bytes) {
		json_value
	} else {
		serde_json::Value::String(
			String::from_utf8_lossy(&response_bytes).to_string()
		)
	};
	
	Ok(ApiResponse {
		status: status.as_u16(),
		status_text,
		headers,
		data,
		response_time: elapsed.as_millis() as u64,
		size,
		timestamp: chrono::Utc::now().to_rfc3339(),
	})
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_fs::init())
		.plugin(tauri_plugin_http::init())
		.plugin(tauri_plugin_shell::init())
		.invoke_handler(tauri::generate_handler![
			load_collections,
			save_collection,
			delete_collection,
			execute_request
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}

fn main() {
	run();
}