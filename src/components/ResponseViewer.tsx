import { useState } from 'react';
import { ApiResponse } from '../types/api';
import { Copy, Download } from 'lucide-react';

interface ResponseViewerProps {
	response: ApiResponse | null;
	loading: boolean;
}

export function ResponseViewer({ response, loading }: ResponseViewerProps) {
	const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');

	if (loading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-center">
					<div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
					<p className="text-gray-500 dark:text-gray-400">Sending request...</p>
				</div>
			</div>
		);
	}

	if (!response) {
		return (
			<div className="flex items-center justify-center h-full">
				<p className="text-gray-500 dark:text-gray-400">No response yet</p>
			</div>
		);
	}

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

	return (
		<div className="flex flex-col h-full">
			<div className="p-4 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center space-x-4">
						<div className="flex items-center space-x-2">
							<span className="text-sm font-medium">Status:</span>
							<span className={`font-medium ${getStatusClass(response.status)}`}>
								{response.status} {response.statusText}
							</span>
						</div>
						<div className="flex items-center space-x-2">
							<span className="text-sm font-medium">Time:</span>
							<span className="text-sm">{response.responseTime}ms</span>
						</div>
						<div className="flex items-center space-x-2">
							<span className="text-sm font-medium">Size:</span>
							<span className="text-sm">{formatSize(response.size)}</span>
						</div>
					</div>
					<div className="flex items-center space-x-2">
						<button
							onClick={() => copyToClipboard(activeTab === 'body' ? formatJson(response.data) : JSON.stringify(response.headers, null, 2))}
							className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
							title="Copy to Clipboard"
						>
							<Copy size={16} />
						</button>
						<button
							className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
							title="Download"
						>
							<Download size={16} />
						</button>
					</div>
				</div>
			</div>

			<div className="flex border-b border-gray-200 dark:border-gray-700">
				{(['body', 'headers'] as const).map((tab) => (
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
						{tab === 'headers' && (
							<span className="ml-1 text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">
								{Object.keys(response.headers).length}
							</span>
						)}
					</button>
				))}
			</div>

			<div className="flex-1 overflow-auto">
				{activeTab === 'body' && (
					<div className="p-4">
						<pre className="text-sm font-mono whitespace-pre-wrap break-words">
							{formatJson(response.data)}
						</pre>
					</div>
				)}

				{activeTab === 'headers' && (
					<div className="p-4">
						<div className="space-y-2">
							{Object.entries(response.headers).map(([key, value]) => (
								<div key={key} className="flex">
									<div className="w-1/3 font-medium text-sm pr-4 break-words">
										{key}:
									</div>
									<div className="flex-1 text-sm break-words">
										{value}
									</div>
								</div>
							))}
							
							{Object.keys(response.headers).length === 0 && (
								<p className="text-gray-500 dark:text-gray-400 text-sm">No headers</p>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}