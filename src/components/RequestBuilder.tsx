import React, { useState } from 'react';
import { ApiRequest, HttpMethod, RequestHeader, QueryParam } from '../types/api';
import { Play, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import '../styles/index.css';

interface RequestBuilderProps {
	request: ApiRequest;
	onRequestChange: (request: ApiRequest) => void;
	onExecute: () => void;
	loading: boolean;
}

export function RequestBuilder({ request, onRequestChange, onExecute, loading }: RequestBuilderProps) {
	const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'auth'>('params');
	const [showPassword, setShowPassword] = useState(false);

	const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

	const updateRequest = (updates: Partial<ApiRequest>) => {
		onRequestChange({
			...request,
			...updates,
			updatedAt: new Date().toISOString()
		});
	};

	const addQueryParam = () => {
		updateRequest({
			queryParams: [...request.queryParams, { key: '', value: '', enabled: true }]
		});
	};

	const updateQueryParam = (index: number, param: QueryParam) => {
		const newParams = [...request.queryParams];
		newParams[index] = param;
		updateRequest({ queryParams: newParams });
	};

	const removeQueryParam = (index: number) => {
		updateRequest({
			queryParams: request.queryParams.filter((_, i) => i !== index)
		});
	};

	const addHeader = () => {
		updateRequest({
			headers: [...request.headers, { key: '', value: '', enabled: true }]
		});
	};

	const updateHeader = (index: number, header: RequestHeader) => {
		const newHeaders = [...request.headers];
		newHeaders[index] = header;
		updateRequest({ headers: newHeaders });
	};

	const removeHeader = (index: number) => {
		updateRequest({
			headers: request.headers.filter((_, i) => i !== index)
		});
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
			onExecute();
		}
	};

	return (
		<div className="request-builder-container">
			<div className="request-builder-header">
				<div className="request-builder-name-row">
					<input
						type="text"
						value={request.name}
						onChange={(e) => updateRequest({ name: e.target.value })}
						className="request-builder-name-input"
						placeholder="Request name"
					/>
				</div>
				
				<div className="request-builder-url-row">
					<select
						value={request.method}
						onChange={(e) => updateRequest({ method: e.target.value as HttpMethod })}
						className="request-builder-method-select"
					>
						{methods.map(method => (
							<option key={method} value={method}>{method}</option>
						))}
					</select>
					
					<input
						type="text"
						value={request.url}
						onChange={(e) => updateRequest({ url: e.target.value })}
						onKeyDown={handleKeyPress}
						className="request-builder-url-input"
						placeholder="Enter request URL"
					/>
					
					<button
						onClick={onExecute}
						disabled={!request.url || loading}
						className="request-builder-send-btn"
					>
						<Play size={16} />
						<span>{loading ? 'Sending...' : 'Send'}</span>
					</button>
				</div>
			</div>

			<div className="request-builder-tabs">
				{(['params', 'headers', 'body', 'auth'] as const).map((tab) => (
					<button
						key={tab}
						onClick={() => setActiveTab(tab)}
						className={`request-builder-tab ${
							activeTab === tab
								? 'request-builder-tab-active'
								: 'request-builder-tab-inactive'
						}`}
					>
						{tab}
						{tab === 'params' && request.queryParams.length > 0 && (
							<span className="request-builder-tab-badge">
								{request.queryParams.filter(p => p.enabled).length}
							</span>
						)}
						{tab === 'headers' && request.headers.length > 0 && (
							<span className="request-builder-tab-badge">
								{request.headers.filter(h => h.enabled).length}
							</span>
						)}
					</button>
				))}
			</div>

			<div className="request-builder-content">
				{activeTab === 'params' && (
					<div className="request-builder-tab-panel">
						<div className="request-builder-tab-content">
							<div className="request-builder-section-header">
								<h3 className="request-builder-section-title">Query Parameters</h3>
								<button
									onClick={addQueryParam}
									className="request-builder-add-btn"
								>
									<Plus size={16} />
									<span>Add</span>
								</button>
							</div>
							
							<div className="request-builder-items">
								{request.queryParams.map((param, index) => (
									<div key={index} className="request-builder-item-row">
										<input
											type="checkbox"
											checked={param.enabled}
											onChange={(e) => updateQueryParam(index, { ...param, enabled: e.target.checked })}
											className="request-builder-checkbox"
										/>
										<input
											type="text"
											value={param.key}
											onChange={(e) => updateQueryParam(index, { ...param, key: e.target.value })}
											className="request-builder-input-small"
											placeholder="Key"
										/>
										<input
											type="text"
											value={param.value}
											onChange={(e) => updateQueryParam(index, { ...param, value: e.target.value })}
											className="request-builder-input-small"
											placeholder="Value"
										/>
										<button
											onClick={() => removeQueryParam(index)}
											className="request-builder-delete-btn"
										>
											<Trash2 size={16} />
										</button>
									</div>
								))}
								
								{request.queryParams.length === 0 && (
									<p className="request-builder-empty-text">No query parameters</p>
								)}
							</div>
						</div>
					</div>
				)}

				{activeTab === 'headers' && (
					<div className="request-builder-tab-panel">
						<div className="request-builder-tab-content">
							<div className="request-builder-section-header">
								<h3 className="request-builder-section-title">Headers</h3>
								<button
									onClick={addHeader}
									className="request-builder-add-btn"
								>
									<Plus size={16} />
									<span>Add</span>
								</button>
							</div>
							
							<div className="request-builder-items">
								{request.headers.map((header, index) => (
									<div key={index} className="request-builder-item-row">
										<input
											type="checkbox"
											checked={header.enabled}
											onChange={(e) => updateHeader(index, { ...header, enabled: e.target.checked })}
											className="request-builder-checkbox"
										/>
										<input
											type="text"
											value={header.key}
											onChange={(e) => updateHeader(index, { ...header, key: e.target.value })}
											className="request-builder-input-small"
											placeholder="Header name"
										/>
										<input
											type="text"
											value={header.value}
											onChange={(e) => updateHeader(index, { ...header, value: e.target.value })}
											className="request-builder-input-small"
											placeholder="Header value"
										/>
										<button
											onClick={() => removeHeader(index)}
											className="request-builder-delete-btn"
										>
											<Trash2 size={16} />
										</button>
									</div>
								))}
								
								{request.headers.length === 0 && (
									<p className="request-builder-empty-text">No headers</p>
								)}
							</div>
						</div>
					</div>
				)}

				{activeTab === 'body' && (
					<div className="request-builder-tab-panel">
						<div className="request-builder-tab-content">
							<div className="mb-3">
								<h3 className="request-builder-section-title mb-2">Request Body</h3>
								<select
									value={request.body?.type || 'none'}
									onChange={(e) => updateRequest({
										body: { 
											type: e.target.value as 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw', 
											content: request.body?.content || '' 
										}
									})}
									className="request-builder-body-type-select"
								>
									<option value="none">None</option>
									<option value="json">JSON</option>
									<option value="raw">Raw</option>
									<option value="form-data">Form Data</option>
									<option value="x-www-form-urlencoded">URL Encoded</option>
								</select>
							</div>
							
							{request.body?.type && request.body.type !== 'none' && (
								<textarea
									value={request.body.content}
									onChange={(e) => updateRequest({
										body: { type: request.body!.type, content: e.target.value }
									})}
									className="request-builder-textarea"
									placeholder={request.body.type === 'json' ? '{\n  "key": "value"\n}' : 'Request body content'}
								/>
							)}
						</div>
					</div>
				)}

				{activeTab === 'auth' && (
					<div className="request-builder-tab-panel">
						<div className="request-builder-tab-content">
							<div className="mb-3">
								<h3 className="request-builder-section-title mb-2">Authentication</h3>
								<select
									value={request.auth?.type || 'none'}
									onChange={(e) => updateRequest({
										auth: { 
											type: e.target.value as 'none' | 'bearer' | 'basic' | 'api-key'
										}
									})}
									className="request-builder-body-type-select"
								>
									<option value="none">No Auth</option>
									<option value="bearer">Bearer Token</option>
									<option value="basic">Basic Auth</option>
									<option value="api-key">API Key</option>
								</select>
							</div>
							
							{request.auth?.type === 'bearer' && (
								<div className="request-builder-form-group">
									<div className="request-builder-form-item">
										<label className="request-builder-label">Bearer Token</label>
										<div className="request-builder-password-container">
											<input
												type={showPassword ? 'text' : 'password'}
												value={request.auth.bearerToken || ''}
												onChange={(e) => updateRequest({
													auth: { 
														type: 'bearer',
														bearerToken: e.target.value 
													}
												})}
												className="request-builder-password-input"
												placeholder="Enter bearer token"
											/>
											<button
												type="button"
												onClick={() => setShowPassword(!showPassword)}
												className="request-builder-password-toggle"
											>
												{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
											</button>
										</div>
									</div>
								</div>
							)}
							
							{request.auth?.type === 'basic' && (
								<div className="request-builder-form-group">
									<div className="request-builder-form-item">
										<label className="request-builder-label">Username</label>
										<input
											type="text"
											value={request.auth.basicAuth?.username || ''}
											onChange={(e) => updateRequest({
												auth: { 
													type: 'basic',
													basicAuth: { 
														username: e.target.value, 
														password: request.auth?.basicAuth?.password || '' 
													} 
												}
											})}
											className="form-input"
											placeholder="Username"
										/>
									</div>
									<div className="request-builder-form-item">
										<label className="request-builder-label">Password</label>
										<div className="request-builder-password-container">
											<input
												type={showPassword ? 'text' : 'password'}
												value={request.auth.basicAuth?.password || ''}
												onChange={(e) => updateRequest({
													auth: { 
														type: 'basic',
														basicAuth: { 
															username: request.auth?.basicAuth?.username || '', 
															password: e.target.value 
														} 
													}
												})}
												className="request-builder-password-input"
												placeholder="Password"
											/>
											<button
												type="button"
												onClick={() => setShowPassword(!showPassword)}
												className="request-builder-password-toggle"
											>
												{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
											</button>
										</div>
									</div>
								</div>
							)}

							{request.auth?.type === 'api-key' && (
								<div className="request-builder-form-group">
									<div className="request-builder-form-item">
										<label className="request-builder-label">Key</label>
										<input
											type="text"
											value={request.auth.apiKey?.key || ''}
											onChange={(e) => updateRequest({
												auth: { 
													type: 'api-key',
													apiKey: { 
														key: e.target.value, 
														value: request.auth?.apiKey?.value || '',
														in: request.auth?.apiKey?.in || 'header'
													} 
												}
											})}
											className="form-input"
											placeholder="API Key name"
										/>
									</div>
									<div className="request-builder-form-item">
										<label className="request-builder-label">Value</label>
										<div className="request-builder-password-container">
											<input
												type={showPassword ? 'text' : 'password'}
												value={request.auth.apiKey?.value || ''}
												onChange={(e) => updateRequest({
													auth: { 
														type: 'api-key',
														apiKey: { 
															key: request.auth?.apiKey?.key || '', 
															value: e.target.value,
															in: request.auth?.apiKey?.in || 'header'
														} 
													}
												})}
												className="request-builder-password-input"
												placeholder="API Key value"
											/>
											<button
												type="button"
												onClick={() => setShowPassword(!showPassword)}
												className="request-builder-password-toggle"
											>
												{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
											</button>
										</div>
									</div>
									<div className="request-builder-form-item">
										<label className="request-builder-label">Add to</label>
										<select
											value={request.auth.apiKey?.in || 'header'}
											onChange={(e) => updateRequest({
												auth: { 
													type: 'api-key',
													apiKey: { 
														key: request.auth?.apiKey?.key || '', 
														value: request.auth?.apiKey?.value || '',
														in: e.target.value as 'header' | 'query'
													} 
												}
											})}
											className="form-input"
										>
											<option value="header">Header</option>
											<option value="query">Query Params</option>
										</select>
									</div>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}