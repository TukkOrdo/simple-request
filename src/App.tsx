import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Collection, ApiRequest, ApiResponse } from './types/api';
import { CollectionSidebar } from './components/CollectionSidebar';
import { RequestBuilder } from './components/RequestBuilder';
import { ResponseViewer } from './components/ResponseViewer';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { Menu, Settings, Plus } from 'lucide-react';
import './styles/globals.css';
import './styles/index.css';

function AppContent() {
	const { theme, toggleTheme } = useTheme();
	const [collections, setCollections] = useState<Collection[]>([]);
	const [activeCollection, setActiveCollection] = useState<Collection | null>(null);
	const [activeRequest, setActiveRequest] = useState<ApiRequest | null>(null);
	const [response, setResponse] = useState<ApiResponse | null>(null);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		loadCollections();
	}, []);

	const loadCollections = async () => {
		try {
			const loadedCollections = await invoke<Collection[]>('load_collections');
			setCollections(loadedCollections);
			if (loadedCollections.length > 0 && !activeCollection) {
				setActiveCollection(loadedCollections[0]);
			}
		} catch (error) {
			console.error('Failed to load collections:', error);
		}
	};

	const saveCollection = async (collection: Collection) => {
		try {
			await invoke('save_collection', { collection });
			await loadCollections();
		} catch (error) {
			console.error('Failed to save collection:', error);
		}
	};

	const createNewCollection = async () => {
		const newCollection: Collection = {
			id: crypto.randomUUID(),
			name: 'New Collection',
			description: '',
			requests: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		
		await saveCollection(newCollection);
		setActiveCollection(newCollection);
	};

	const createNewRequest = () => {
		if (!activeCollection) return;

		const newRequest: ApiRequest = {
			id: crypto.randomUUID(),
			name: 'New Request',
			method: 'GET',
			url: '',
			headers: [],
			queryParams: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		const updatedCollection = {
			...activeCollection,
			requests: [...activeCollection.requests, newRequest],
			updatedAt: new Date().toISOString()
		};

		setActiveCollection(updatedCollection);
		setActiveRequest(newRequest);
		saveCollection(updatedCollection);
	};

	const updateRequest = (updatedRequest: ApiRequest) => {
		if (!activeCollection) return;

		const updatedCollection = {
			...activeCollection,
			requests: activeCollection.requests.map(req => 
				req.id === updatedRequest.id ? updatedRequest : req
			),
			updatedAt: new Date().toISOString()
		};

		setActiveCollection(updatedCollection);
		setActiveRequest(updatedRequest);
		saveCollection(updatedCollection);
	};

	const executeRequest = async (request: ApiRequest) => {
		setLoading(true);
		setResponse(null);

		try {
			const startTime = Date.now();
			const result = await invoke<ApiResponse>('execute_request', { request });
			const endTime = Date.now();
			
			const responseWithTiming = {
				...result,
				responseTime: endTime - startTime,
				timestamp: new Date().toISOString()
			};

			setResponse(responseWithTiming);
		} catch (error) {
			console.error('Request failed:', error);
			setResponse({
				status: 0,
				statusText: 'Error',
				headers: {},
				data: { error: error },
				responseTime: 0,
				size: 0,
				timestamp: new Date().toISOString()
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className={`app-container ${theme === 'dark' ? 'dark' : ''}`}>
			<div className="app-content">
				<div className="app-header">
					<div className="app-header-content">
						<div className="app-logo-section">
							<button
								onClick={() => setSidebarOpen(!sidebarOpen)}
								className="icon-btn-secondary"
							>
								<Menu size={20} />
							</button>
							<h1 className="app-title">Simple Request</h1>
						</div>
						<div className="app-controls">
							<button
								onClick={createNewCollection}
								className="icon-btn-secondary"
								title="New Collection"
							>
								<Plus size={20} />
							</button>
							<button
								onClick={toggleTheme}
								className="icon-btn-secondary"
								title="Toggle Theme"
							>
								<Settings size={20} />
							</button>
						</div>
					</div>
				</div>

				<div className="app-main">
					{sidebarOpen && (
						<div className="flex-shrink-0">
							<CollectionSidebar
								collections={collections}
								activeCollection={activeCollection}
								activeRequest={activeRequest}
								onCollectionSelect={setActiveCollection}
								onRequestSelect={setActiveRequest}
								onNewRequest={createNewRequest}
								onDeleteRequest={(requestId: string) => {
									if (!activeCollection) return;
									const updatedCollection = {
										...activeCollection,
										requests: activeCollection.requests.filter(req => req.id !== requestId),
										updatedAt: new Date().toISOString()
									};
									setActiveCollection(updatedCollection);
									if (activeRequest?.id === requestId) {
										setActiveRequest(null);
										setResponse(null);
									}
									saveCollection(updatedCollection);
								}}
							/>
						</div>
					)}

					<div className="content-panel">
						{activeRequest ? (
							<>
								<div className="content-split">
									<RequestBuilder
										request={activeRequest}
										onRequestChange={updateRequest}
										onExecute={() => executeRequest(activeRequest)}
										loading={loading}
									/>
								</div>
								<div className="content-area">
									<ResponseViewer response={response} loading={loading} />
								</div>
							</>
						) : (
							<div className="empty-state">
								<div className="empty-state-content">
									<h2 className="empty-state-title">No request selected</h2>
									<p className="empty-state-description">
										Select a request from the sidebar or create a new one
									</p>
									<button
										onClick={createNewRequest}
										disabled={!activeCollection}
										className="btn-primary"
									>
										Create New Request
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default function App() {
	return (
		<ThemeProvider>
			<AppContent />
		</ThemeProvider>
	);
}