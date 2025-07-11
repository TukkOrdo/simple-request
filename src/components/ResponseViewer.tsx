import { useState } from 'react';
import { ApiResponse } from '../types/api';
import { Copy, Download } from 'lucide-react';
import '../styles/index.css';

interface ResponseViewerProps {
	response: ApiResponse | null;
	loading: boolean;
}

export function ResponseViewer({ response, loading }: ResponseViewerProps) {
	const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');

	const formatJson = (data: any) => {
		try {
			if (typeof data === 'string') {
				return JSON.stringify(JSON.parse(data), null, 2);
			}
			return JSON.stringify(data, null, 2);
		} catch {
			return typeof data === 'string' ? data : JSON.stringify(data);
		}
	};

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	};

	const handleDownload = () => {
		if (!response) return;
		
		let content = '';
		let fileName = '';
		let mimeType = 'text/plain';
		
		if (activeTab === 'body') {
			// Figure out what type of content this is
			const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
			
			if (contentType.includes('application/json')) {
				content = formatJson(response.data);
				fileName = 'response-body.json';
				mimeType = 'application/json';
			} else if (contentType.includes('text/html')) {
				content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
				fileName = 'response-body.html';
				mimeType = 'text/html';
			} else if (contentType.includes('text/xml') || contentType.includes('application/xml')) {
				content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
				fileName = 'response-body.xml';
				mimeType = 'text/xml';
			} else if (contentType.includes('text/')) {
				content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
				fileName = 'response-body.txt';
				mimeType = 'text/plain';
			} else {
				// Fallback to json format for unknown types
				content = formatJson(response.data);
				fileName = 'response-body.json';
				mimeType = 'application/json';
			}
		} else {
			content = JSON.stringify(response.headers, null, 2);
			fileName = 'response-headers.json';
			mimeType = 'application/json';
		}
		
		const now = new Date();
		const timeStr = now.toISOString().replace(/:/g, '-').split('.')[0];
		const ext = fileName.split('.').pop();
		fileName = fileName.replace(`.${ext}`, `-${timeStr}.${ext}`);
		
		const blob = new Blob([content], { type: mimeType });
		const url = window.URL.createObjectURL(blob);
		
		const link = document.createElement('a');
		link.href = url;
		link.setAttribute('download', fileName);
		document.body.appendChild(link);
		link.click();
		
		document.body.removeChild(link);
		window.URL.revokeObjectURL(url);
	};

	const getStatusClass = (status: number) => {
		if (status >= 200 && status < 300) return 'status-2xx';
		if (status >= 300 && status < 400) return 'status-3xx';
		if (status >= 400 && status < 500) return 'status-4xx';
		if (status >= 500) return 'status-5xx';
		return '';
	};

	const formatSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	if (loading) {
		return (
			<div className="loading-container">
				<div className="loading-content">
					<div className="response-viewer-loading-spinner"></div>
					<p className="loading-text">Sending request...</p>
				</div>
			</div>
		);
	}

	if (!response) {
		return (
			<div className="loading-container">
				<p className="loading-text">No response yet</p>
			</div>
		);
	}

	return (
		<div className="response-viewer-container">
			<div className="response-viewer-header">
				<div className="response-viewer-status-row">
					<div className="response-viewer-status-info">
						<div className="response-viewer-status-item">
							<span className="response-viewer-status-label">Status:</span>
							<span className={`response-viewer-status-code ${getStatusClass(response.status)}`}>
								{response.status} {response.statusText}
							</span>
						</div>
						<div className="response-viewer-status-item">
							<span className="response-viewer-status-label">Time:</span>
							<span className="response-viewer-status-value">{response.responseTime}ms</span>
						</div>
						<div className="response-viewer-status-item">
							<span className="response-viewer-status-label">Size:</span>
							<span className="response-viewer-status-value">{formatSize(response.size)}</span>
						</div>
					</div>
					<div className="response-viewer-actions">
						<button
							onClick={() => {
								const textToCopy = activeTab === 'body' ? formatJson(response.data) : JSON.stringify(response.headers, null, 2);
								copyToClipboard(textToCopy);
							}}
							className="response-viewer-action-btn"
							title="Copy to Clipboard"
						>
							<Copy size={16} />
						</button>
						<button
							onClick={handleDownload}
							className="response-viewer-action-btn"
							title="Download"
						>
							<Download size={16} />
						</button>
					</div>
				</div>
			</div>

			<div className="response-viewer-tabs">
				{(['body', 'headers'] as const).map((tab) => (
					<button
						key={tab}
						onClick={() => setActiveTab(tab)}
						className={`response-viewer-tab ${activeTab === tab ? 'response-viewer-tab-active' : 'response-viewer-tab-inactive'}`}
					>
						{tab}
						{tab === 'headers' && (
							<span className="response-viewer-tab-badge">
								{Object.keys(response.headers).length}
							</span>
						)}
					</button>
				))}
			</div>

			<div className="response-viewer-content">
				{activeTab === 'body' && (
					<div className="response-viewer-tab-panel">
						<div className="response-viewer-tab-content">
							<pre className="response-viewer-body-content">
								{formatJson(response.data)}
							</pre>
						</div>
					</div>
				)}

				{activeTab === 'headers' && (
					<div className="response-viewer-tab-panel">
						<div className="response-viewer-tab-content">
							<div className="response-viewer-headers-list">
								{Object.entries(response.headers).map(([key, value]) => (
									<div key={key} className="response-viewer-header-row">
										<div className="response-viewer-header-key">
											{key}:
										</div>
										<div className="response-viewer-header-value">
											{value}
										</div>
									</div>
								))}
								
								{Object.keys(response.headers).length === 0 && (
									<p className="response-viewer-headers-empty">No headers</p>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}