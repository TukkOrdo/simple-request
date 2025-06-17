import React, { useState } from 'react';
import { ApiRequest, HttpMethod, RequestHeader, QueryParam } from '../types/api';
import { Play, Plus, Trash2, Eye, EyeOff } from 'lucide-react';

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
		<div className="flex flex-col h-full">
			<div className="p-4 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center space-x-2 mb-3">
					<input
						type="text"
						value={request.name}
						onChange={(e) => updateRequest({ name: e.target.value })}
						className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
						placeholder="Request name"
					/>
				</div>
				
				<div className="flex items-center space-x-2">
					<select
						value={request.method}
						onChange={(e) => updateRequest({ method: e.target.value as HttpMethod })}
						className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 font-medium"
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
						className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
						placeholder="Enter request URL"
					/>
					
					<button
						onClick={onExecute}
						disabled={!request.url || loading}
						className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
					>
						<Play size={16} />
						<span>{loading ? 'Sending...' : 'Send'}</span>
					</button>
				</div>
			</div>

			<div className="flex border-b border-gray-200 dark:border-gray-700">
				{(['params', 'headers', 'body', 'auth'] as const).map((tab) => (
					<button
						key={tab}
						onClick={() => setActiveTab(tab)}
						className={`px-4 py-2 text-sm font-medium capitalize ${
							activeTab === tab
								? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
								: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
						}`}
					>
						{tab}
						{tab === 'params' && request.queryParams.length > 0 && (
							<span className="ml-1 text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">
								{request.queryParams.filter(p => p.enabled).length}
							</span>
						)}
						{tab === 'headers' && request.headers.length > 0 && (
							<span className="ml-1 text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">
								{request.headers.filter(h => h.enabled).length}
							</span>
						)}
					</button>
				))}
			</div>

			<div className="flex-1 overflow-auto">
				{activeTab === 'params' && (
					<div className="p-4">
						<div className="flex justify-between items-center mb-3">
							<h3 className="text-sm font-medium">Query Parameters</h3>
							<button
								onClick={addQueryParam}
								className="text-blue-500 hover:text-blue-600 text-sm flex items-center space-x-1"
							>
								<Plus size={16} />
								<span>Add</span>
							</button>
						</div>
						
						<div className="space-y-2">
							{request.queryParams.map((param, index) => (
								<div key={index} className="flex items-center space-x-2">
									<input
										type="checkbox"
										checked={param.enabled}
										onChange={(e) => updateQueryParam(index, { ...param, enabled: e.target.checked })}
										className="w-4 h-4"
									/>
									<input
										type="text"
										value={param.key}
										onChange={(e) => updateQueryParam(index, { ...param, key: e.target.value })}
										className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
										placeholder="Key"
									/>
									<input
										type="text"
										value={param.value}
										onChange={(e) => updateQueryParam(index, { ...param, value: e.target.value })}
										className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
										placeholder="Value"
									/>
									<button
										onClick={() => removeQueryParam(index)}
										className="text-red-500 hover:text-red-600 p-1"
									>
										<Trash2 size={16} />
									</button>
								</div>
							))}
							
							{request.queryParams.length === 0 && (
								<p className="text-gray-500 dark:text-gray-400 text-sm">No query parameters</p>
							)}
						</div>
					</div>
				)}

				{activeTab === 'headers' && (
					<div className="p-4">
						<div className="flex justify-between items-center mb-3">
							<h3 className="text-sm font-medium">Headers</h3>
							<button
								onClick={addHeader}
								className="text-blue-500 hover:text-blue-600 text-sm flex items-center space-x-1"
							>
								<Plus size={16} />
								<span>Add</span>
							</button>
						</div>
						
						<div className="space-y-2">
							{request.headers.map((header, index) => (
								<div key={index} className="flex items-center space-x-2">
									<input
										type="checkbox"
										checked={header.enabled}
										onChange={(e) => updateHeader(index, { ...header, enabled: e.target.checked })}
										className="w-4 h-4"
									/>
									<input
										type="text"
										value={header.key}
										onChange={(e) => updateHeader(index, { ...header, key: e.target.value })}
										className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
										placeholder="Header name"
									/>
									<input
										type="text"
										value={header.value}
										onChange={(e) => updateHeader(index, { ...header, value: e.target.value })}
										className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
										placeholder="Header value"
									/>
									<button
										onClick={() => removeHeader(index)}
										className="text-red-500 hover:text-red-600 p-1"
									>
										<Trash2 size={16} />
									</button>
								</div>
							))}
							
							{request.headers.length === 0 && (
								<p className="text-gray-500 dark:text-gray-400 text-sm">No headers</p>
							)}
						</div>
					</div>
				)}

				{activeTab === 'body' && (
					<div className="p-4">
						<div className="mb-3">
							<h3 className="text-sm font-medium mb-2">Request Body</h3>
							<select
								value={request.body?.type || 'none'}
								onChange={(e) => updateRequest({
									body: { 
										type: e.target.value as 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw', 
										content: request.body?.content || '' 
									}
								})}
								className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
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
								className="w-full h-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm font-mono"
								placeholder={request.body.type === 'json' ? '{\n  "key": "value"\n}' : 'Request body content'}
							/>
						)}
					</div>
				)}

				{activeTab === 'auth' && (
					<div className="p-4">
						<div className="mb-3">
							<h3 className="text-sm font-medium mb-2">Authentication</h3>
							<select
								value={request.auth?.type || 'none'}
								onChange={(e) => updateRequest({
									auth: { 
										type: e.target.value as 'none' | 'bearer' | 'basic' | 'api-key'
									}
								})}
								className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
							>
								<option value="none">No Auth</option>
								<option value="bearer">Bearer Token</option>
								<option value="basic">Basic Auth</option>
								<option value="api-key">API Key</option>
							</select>
						</div>
						
						{request.auth?.type === 'bearer' && (
							<div>
								<label className="block text-sm font-medium mb-1">Bearer Token</label>
								<div className="relative">
									<input
										type={showPassword ? 'text' : 'password'}
										value={request.auth.bearerToken || ''}
										onChange={(e) => updateRequest({
											auth: { 
												type: 'bearer',
												bearerToken: e.target.value 
											}
										})}
										className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
										placeholder="Enter bearer token"
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
									>
										{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
									</button>
								</div>
							</div>
						)}
						
						{request.auth?.type === 'basic' && (
							<div className="space-y-3">
								<div>
									<label className="block text-sm font-medium mb-1">Username</label>
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
										className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
										placeholder="Username"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium mb-1">Password</label>
									<div className="relative">
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
											className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
											placeholder="Password"
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
										>
											{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
										</button>
									</div>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}