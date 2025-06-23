import { Collection, ApiRequest } from '../types/api';
import { Plus, Trash2, Folder, FileText, Download } from 'lucide-react';
import { ImportExportActions, createSingleCollectionExporter } from './ImportExportActions';
import '../styles/index.css';

interface CollectionSidebarProps {
	collections: Collection[];
	activeCollection: Collection | null;
	activeRequest: ApiRequest | null;
	onCollectionSelect: (collection: Collection) => void;
	onRequestSelect: (request: ApiRequest) => void;
	onNewRequest: () => void;
	onDeleteRequest: (requestId: string) => void;
	onImportCollections?: (collections: Collection[]) => void;
}

export function CollectionSidebar({
	collections,
	activeCollection,
	activeRequest,
	onCollectionSelect,
	onRequestSelect,
	onNewRequest,
	onDeleteRequest,
	onImportCollections
}: CollectionSidebarProps) {
	const getMethodClass = (method: string) => {
		switch (method) {
			case 'GET': return 'method-get';
			case 'POST': return 'method-post';
			case 'PUT': return 'method-put';
			case 'PATCH': return 'method-patch';
			case 'DELETE': return 'method-delete';
			case 'HEAD': return 'method-head';
			case 'OPTIONS': return 'method-options';
			default: return 'method-default';
		}
	};

	const handleImport = (importedCollections: Collection[]) => {
		if (onImportCollections) {
			onImportCollections(importedCollections);
		}
	};

	return (
		<div className="sidebar-container">
			<div className="sidebar-section">
				<div className="sidebar-section-header">
					<h2 className="sidebar-section-title">Collections</h2>
					<ImportExportActions 
						collections={collections}
						onImport={handleImport}
						className="sidebar-actions"
					/>
				</div>

				<div className="sidebar-collections-list">
					{collections.map((collection) => (
						<div key={collection.id} className="sidebar-collection-item">
							<button
								onClick={() => onCollectionSelect(collection)}
								className={`sidebar-collection-button ${
									activeCollection?.id === collection.id
										? 'sidebar-collection-active'
										: 'sidebar-collection-inactive'
								}`}
							>
								<Folder size={16} />
								<span className="sidebar-collection-name">{collection.name}</span>
							</button>
							<button
								onClick={(e) => {
									e.stopPropagation();
									createSingleCollectionExporter(collection)();
								}}
								className="sidebar-collection-export"
								title="Export Collection"
							>
								<Download size={14} />
							</button>
						</div>
					))}
				</div>
			</div>

			{activeCollection && (
				<div className="sidebar-requests-section">
					<div className="sidebar-requests-header">
						<h3 className="sidebar-requests-title">Requests</h3>
						<button
							onClick={onNewRequest}
							className="icon-btn"
							title="Add Request"
						>
							<Plus size={16} />
						</button>
					</div>

					<div className="sidebar-requests-list">
						<div className="sidebar-request-items">
							{activeCollection.requests.map((request) => (
								<div
									key={request.id}
									className={`sidebar-request-item group ${
										activeRequest?.id === request.id
											? 'sidebar-request-active'
											: 'sidebar-request-inactive'
									}`}
								>
									<FileText size={14} />
									<button
										onClick={() => onRequestSelect(request)}
										className="sidebar-request-content"
									>
										<div className="sidebar-request-info">
											<span className={`sidebar-request-method ${getMethodClass(request.method)}`}>
												{request.method}
											</span>
											<span className="sidebar-request-name">{request.name}</span>
										</div>
									</button>
									<button
										onClick={() => onDeleteRequest(request.id)}
										className="sidebar-request-delete group-hover-show"
										title="Delete Request"
									>
										<Trash2 size={16} />
									</button>
								</div>
							))}

							{activeCollection.requests.length === 0 && (
								<div className="sidebar-empty-state">
									<p className="sidebar-empty-text">
										No requests in this collection
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{!activeCollection && collections.length === 0 && (
				<div className="sidebar-empty-state">
					<p className="sidebar-empty-text">
						No collections yet
					</p>
				</div>
			)}
		</div>
	);
}