use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SecretReference {
	pub id: String,
	pub name: String,
	#[serde(rename = "type")]
	pub secret_type: String,
	pub created_at: String,
	pub last_used: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SecretValue {
	pub id: String,
	pub name: String,
	pub value: String,
	#[serde(rename = "type")]
	pub secret_type: String,
}

pub struct AppState {
	pub secret_references: std::sync::Mutex<Vec<SecretReference>>,
}

impl AppState {
	pub fn new() -> Self {
		let secret_references = match load_secret_references() {
			Ok(refs) => std::sync::Mutex::new(refs),
			Err(e) => {
				eprintln!("Warning: Failed to load secret references: {}", e);
				std::sync::Mutex::new(Vec::new())
			}
		};
		
		AppState {
			secret_references,
		}
	}
}

#[tauri::command]
pub async fn store_secret(
	id: String,
	name: String,
	value: String,
	secret_type: String,
	state: State<'_, AppState>,
) -> Result<(), String> {
	use keyring::Entry;
	
	let service_name = format!("simple-request-secret-{}", id);
	let entry = Entry::new(&service_name, &id)
		.map_err(|e| format!("Failed to create keychain entry: {}", e))?;
	
	entry.set_password(&value)
		.map_err(|e| format!("Failed to store secret in keychain: {}", e))?;
	
	let reference = SecretReference {
		id: id.clone(),
		name,
		secret_type,
		created_at: chrono::Utc::now().to_rfc3339(),
		last_used: None,
	};
	
	let mut refs = state.secret_references.lock().unwrap();
	refs.retain(|r| r.id != id);
	refs.push(reference);
	
	save_secret_references(&refs)?;
	
	Ok(())
}

#[tauri::command]
pub async fn get_secret(secret_id: String) -> Result<String, String> {
	use keyring::Entry;
	
	let service_name = format!("simple-request-secret-{}", secret_id);
	let entry = Entry::new(&service_name, &secret_id)
		.map_err(|e| format!("Failed to create keychain entry: {}", e))?;
	
	let value = entry.get_password()
		.map_err(|e| format!("Failed to retrieve secret from keychain: {}", e))?;
	
	Ok(value)
}

#[tauri::command]
pub async fn get_secret_references(state: State<'_, AppState>) -> Result<Vec<SecretReference>, String> {
	let refs = state.secret_references.lock().unwrap();
	Ok(refs.clone())
}

#[tauri::command]
pub async fn delete_secret(
	secret_id: String,
	state: State<'_, AppState>,
) -> Result<(), String> {
	use keyring::Entry;
	
	let service_name = format!("simple-request-secret-{}", secret_id);
	let entry = Entry::new(&service_name, &secret_id)
		.map_err(|e| format!("Failed to create keychain entry: {}", e))?;
	
	entry.delete_credential()
		.map_err(|e| format!("Failed to delete secret from keychain: {}", e))?;
	
	let mut refs = state.secret_references.lock().unwrap();
	refs.retain(|r| r.id != secret_id);
	
	save_secret_references(&refs)?;
	
	Ok(())
}

#[tauri::command]
pub async fn store_secret_reference(
	reference: SecretReference,
	state: State<'_, AppState>,
) -> Result<(), String> {
	let mut refs = state.secret_references.lock().unwrap();
	refs.retain(|r| r.id != reference.id);
	refs.push(reference);
	
	save_secret_references(&refs)?;
	Ok(())
}

#[tauri::command]
pub async fn delete_secret_reference(
	secret_id: String,
	state: State<'_, AppState>,
) -> Result<(), String> {
	let mut refs = state.secret_references.lock().unwrap();
	refs.retain(|r| r.id != secret_id);
	
	save_secret_references(&refs)?;
	Ok(())
}

#[tauri::command]
pub async fn update_secret_last_used(
	secret_id: String,
	last_used: String,
	state: State<'_, AppState>,
) -> Result<(), String> {
	let mut refs = state.secret_references.lock().unwrap();
	
	if let Some(reference) = refs.iter_mut().find(|r| r.id == secret_id) {
		reference.last_used = Some(last_used);
		save_secret_references(&refs)?;
	}
	
	Ok(())
}

#[tauri::command]
pub async fn encrypt_export(data: String, password: String) -> Result<String, String> {
	use aes_gcm::{Aes256Gcm, Key, Nonce, aead::{Aead, KeyInit}};
	use argon2::{Argon2, password_hash::{PasswordHasher, SaltString, rand_core::OsRng}};
	use base64::{Engine, engine::general_purpose};
	
	let salt = SaltString::generate(&mut OsRng);
	let argon2 = Argon2::default();
	let password_hash = argon2.hash_password(password.as_bytes(), &salt)
		.map_err(|e| format!("Failed to hash password: {}", e))?;
	
	let hash_bytes = password_hash.hash.unwrap();
	let key_bytes = &hash_bytes.as_bytes()[..32];
	let key = Key::<Aes256Gcm>::from_slice(key_bytes);
	let cipher = Aes256Gcm::new(key);
	
	let nonce_bytes: [u8; 12] = rand::random();
	let nonce = Nonce::from_slice(&nonce_bytes);
	
	let ciphertext = cipher.encrypt(nonce, data.as_bytes())
		.map_err(|e| format!("Encryption failed: {}", e))?;
	
	let mut result = Vec::new();
	result.extend_from_slice(salt.as_str().as_bytes());
	result.push(b':');
	result.extend_from_slice(&nonce_bytes);
	result.extend_from_slice(&ciphertext);
	
	Ok(general_purpose::STANDARD.encode(result))
}

#[tauri::command]
pub async fn decrypt_import(encrypted_data: String, password: String) -> Result<String, String> {
	use aes_gcm::{Aes256Gcm, Key, Nonce, aead::{Aead, KeyInit}};
	use argon2::{Argon2, password_hash::{PasswordHasher, SaltString}};
	use base64::{Engine, engine::general_purpose};
	
	let combined_data = general_purpose::STANDARD.decode(&encrypted_data)
		.map_err(|e| format!("Failed to decode base64: {}", e))?;
	
	let separator_pos = combined_data.iter().position(|&x| x == b':')
		.ok_or("Invalid encrypted data format")?;
	
	let salt_str = String::from_utf8(combined_data[..separator_pos].to_vec())
		.map_err(|e| format!("Invalid salt format: {}", e))?;
	
	let remaining = &combined_data[separator_pos + 1..];
	if remaining.len() < 12 {
		return Err("Invalid encrypted data: too short".to_string());
	}
	
	let nonce_bytes = &remaining[..12];
	let ciphertext = &remaining[12..];
	
	let salt = SaltString::from_b64(&salt_str)
		.map_err(|e| format!("Invalid salt: {}", e))?;
	let argon2 = Argon2::default();
	let password_hash = argon2.hash_password(password.as_bytes(), &salt)
		.map_err(|e| format!("Failed to hash password: {}", e))?;
	
	let hash_bytes = password_hash.hash.unwrap();
	let key_bytes = &hash_bytes.as_bytes()[..32];
	let key = Key::<Aes256Gcm>::from_slice(key_bytes);
	let cipher = Aes256Gcm::new(key);
	
	let nonce = Nonce::from_slice(nonce_bytes);
	
	let plaintext = cipher.decrypt(nonce, ciphertext)
		.map_err(|e| format!("Decryption failed - incorrect password?: {}", e))?;
	
	String::from_utf8(plaintext)
		.map_err(|e| format!("Invalid UTF-8 in decrypted data: {}", e))
}

fn save_secret_references(refs: &[SecretReference]) -> Result<(), String> {
	let app_dir = get_app_data_dir()?;
	let refs_file = app_dir.join("secret_references.json");
	
	let json = serde_json::to_string_pretty(refs)
		.map_err(|e| format!("Failed to serialize references: {}", e))?;
	
	fs::write(&refs_file, json)
		.map_err(|e| format!("Failed to write references file: {}", e))?;
	
	Ok(())
}

pub fn load_secret_references() -> Result<Vec<SecretReference>, String> {
	let app_dir = get_app_data_dir()?;
	let refs_file = app_dir.join("secret_references.json");
	
	if !refs_file.exists() {
		return Ok(Vec::new());
	}
	
	let content = fs::read_to_string(&refs_file)
		.map_err(|e| format!("Failed to read references file: {}", e))?;
	
	serde_json::from_str(&content)
		.map_err(|e| format!("Failed to parse references file: {}", e))
}

fn get_app_data_dir() -> Result<PathBuf, String> {
	let app_dir = dirs::data_dir()
		.ok_or("Failed to get data directory")?
		.join("simple-request");
	
	fs::create_dir_all(&app_dir)
		.map_err(|e| format!("Failed to create app directory: {}", e))?;
	
	Ok(app_dir)
}