import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Collection, ApiRequest, ApiResponse } from './types/api';
import { CollectionSidebar } from './components/CollectionSidebar';
import { RequestBuilder } from './components/RequestBuilder';
import { ResponseViewer } from './components/ResponseViewer';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { DragHandle } from './components/DragHandle';
import { Menu, Settings, Plus } from 'lucide-react';
import './styles/globals.css';
import './styles/index.css';

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 520;
const PANEL_MIN = 120;

function AppContent() {
	const { theme, toggleTheme } = useTheme();
	const [collections, setCollections] = useState<Collection[]>([]);
	const [activeCollection, setActiveCollection] = useState<Collection | null>(null);
	const [activeRequest, setActiveRequest] = useState<ApiRequest | null>(null);
	const [response, setResponse] = useState<ApiResponse | null>(null);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [loading, setLoading] = useState(false);

	// Resizable panel state
	const [sidebarWidth, setSidebarWidth] = useState(() =>
		Number(localStorage.getItem('sidebarWidth')) || 240
	);
	const [requestPanelHeight, setRequestPanelHeight] = useState(() =>
		Number(localStorage.getItem('requestPanelHeight')) || 50
	);

	const handleSidebarResize = useCallback((delta: number) => {
		setSidebarWidth(prev => {
			const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, prev + delta));
			localStorage.setItem('sidebarWidth', String(next));
			return next;
		});
	}, []);

	const handleVerticalResize = useCallback((delta: number) => {
		setRequestPanelHeight(prev => {
			const contentPanel = document.querySelector('.content-panel') as HTMLElement;
			if (!contentPanel) return prev;
			const totalHeight = contentPanel.offsetHeight;
			const deltaPct = (delta / totalHeight) * 100;
			const minPct = (PANEL_MIN / totalHeight) * 100;
			const maxPct = 100 - minPct;
			const next = Math.min(maxPct, Math.max(minPct, prev + deltaPct));
			localStorage.setItem('requestPanelHeight', String(next));
			return next;
		});
	}, []);

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

	const deleteCollection = async (collectionId: string) => {
		try {
			await invoke('delete_collection', { collectionId });
			await loadCollections();
		} catch (error) {
			console.error('Failed to delete collection:', error);
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

	const handleDeleteCollection = async (collectionId: string) => {
		const collectionToDelete = collections.find(c => c.id === collectionId);
		
		if (!collectionToDelete) return;
		
		const confirmed = window.confirm(
			`Are you sure you want to delete "${collectionToDelete.name}"? This will also delete all ${collectionToDelete.requests.length} request(s) in this collection. This action cannot be undone.`
		);
		
		if (!confirmed) return;
		
		// Clear active states if the deleted collection was active
		if (activeCollection?.id === collectionId) {
			setActiveCollection(null);
			setActiveRequest(null);
			setResponse(null);
		}
		
		// Delete the collection
		await deleteCollection(collectionId);
	};

	const handleRenameCollection = async (collectionId: string, newName: string) => {
		const collection = collections.find(c => c.id === collectionId);
		if (!collection) return;

		const updatedCollection = {
			...collection,
			name: newName,
			updatedAt: new Date().toISOString()
		};

		await saveCollection(updatedCollection);

		// Update active collection if it's the one being renamed
		if (activeCollection?.id === collectionId) {
			setActiveCollection(updatedCollection);
		}
	};

	const handleImportCollections = async (importedCollections: Collection[]) => {
		const processedCollections = importedCollections.map(collection => {
			// Check if collection name already exists
			const existingCollection = collections.find(c => c.name === collection.name);
			
			let finalCollection = { ...collection };
			
			if (existingCollection) {
				finalCollection.name = `${collection.name} (imported)`;
			}
			
			// Generate new IDs to avoid conflicts
			finalCollection.id = crypto.randomUUID();
			finalCollection.requests = finalCollection.requests.map(request => ({
				...request,
				id: crypto.randomUUID(),
				collectionId: finalCollection.id,
				createdAt: request.createdAt || new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}));
			
			finalCollection.createdAt = collection.createdAt || new Date().toISOString();
			finalCollection.updatedAt = new Date().toISOString();
			
			return finalCollection;
		});

		// Save all imported collections
		try {
			for (const collection of processedCollections) {
				await saveCollection(collection);
			}
			
			const importedCount = processedCollections.length;
			const totalRequests = processedCollections.reduce((sum, col) => sum + col.requests.length, 0);
			alert(`Successfully imported ${importedCount} collection(s) with ${totalRequests} request(s)`);
		} catch (error) {
			console.error('Failed to import collections:', error);
			alert('Failed to import some collections. Please try again.');
		}
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

			setResponse({
				...result,
				responseTime: endTime - startTime,
				timestamp: new Date().toISOString()
			});
		} catch (error) {
			console.error('Request failed:', error);
			setResponse({
				status: 0,
				statusText: 'Error',
				headers: {},
				data: { error },
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
						<>
							<div
								className="flex-shrink-0"
								style={{ width: sidebarWidth, minWidth: SIDEBAR_MIN, maxWidth: SIDEBAR_MAX, height: '100%' }}
							>
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
									onDeleteCollection={handleDeleteCollection}
									onRenameCollection={handleRenameCollection}
									onImportCollections={handleImportCollections}
								/>
							</div>

							<DragHandle direction="horizontal" onResize={handleSidebarResize} />
						</>
					)}

					<div className="content-panel">
						{activeRequest ? (
							<>
								<div
									className="content-split"
									style={{ height: `${requestPanelHeight}%`, flex: 'none' }}
								>
									<RequestBuilder
										request={activeRequest}
										onRequestChange={updateRequest}
										onExecute={() => executeRequest(activeRequest)}
										loading={loading}
									/>
								</div>

								<DragHandle direction="vertical" onResize={handleVerticalResize} />

								<div className="content-area" style={{ flex: 1 }}>
									<ResponseViewer response={response} loading={loading} />
								</div>
							</>
						) : (
							<div className="empty-state">
								<div className="empty-state-content">
									{collections.length === 0 ? (
										<>
											<h2 className="empty-state-title">No collections found</h2>
											<p className="empty-state-description">
												Get started by creating your first collection to organize your API requests
											</p>
											<button onClick={createNewCollection} className="btn-primary">
												Create New Collection
											</button>
										</>
									) : (
										<>
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
										</>
									)}
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