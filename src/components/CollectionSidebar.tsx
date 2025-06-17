import { Collection, ApiRequest } from '../types/api';
import { Plus, Trash2, Folder, FileText } from 'lucide-react';

interface CollectionSidebarProps {
	collections: Collection[];
	activeCollection: Collection | null;
	activeRequest: ApiRequest | null;
	onCollectionSelect: (collection: Collection) => void;
	onRequestSelect: (request: ApiRequest) => void;
	onNewRequest: () => void;
	onDeleteRequest: (requestId: string) => void;
}

export function CollectionSidebar({
	collections,
	activeCollection,
	activeRequest,
	onCollectionSelect,
	onRequestSelect,
	onNewRequest,
	onDeleteRequest
}: CollectionSidebarProps) {
	return (
		<div className="w-80 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
			<div className="p-4 border-b border-gray-200 dark:border-gray-700">
				<h2 className="text-lg font-semibold mb-3">Collections</h2>
				{collections.map((collection) => (
					<div key={collection.id} className="mb-2">
						<button
							onClick={() => onCollectionSelect(collection)}
							className={`w-full flex items-center space-x-2 px-3 py-2 rounded text-left ${
								activeCollection?.id === collection.id
									? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
									: 'hover:bg-gray-200 dark:hover:bg-gray-700'
							}`}
						>
							<Folder size={16} />
							<span className="truncate">{collection.name}</span>
						</button>
					</div>
				))}
			</div>

			{activeCollection && (
				<div className="flex-1 overflow-auto">
					<div className="p-4">
						<div className="flex items-center justify-between mb-3">
							<h3 className="text-sm font-medium">Requests</h3>
							<button
								onClick={onNewRequest}
								className="text-blue-500 hover:text-blue-600 p-1"
								title="Add Request"
							>
								<Plus size={16} />
							</button>
						</div>

						<div className="space-y-1">
							{activeCollection.requests.map((request) => (
								<div
									key={request.id}
									className={`flex items-center space-x-2 px-3 py-2 rounded group ${
										activeRequest?.id === request.id
											? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
											: 'hover:bg-gray-200 dark:hover:bg-gray-700'
									}`}
								>
									<FileText size={14} />
									<button
										onClick={() => onRequestSelect(request)}
										className="flex-1 text-left"
									>
										<div className="flex items-center space-x-2">
											<span className={`text-xs px-1 rounded font-mono ${
												request.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
												request.method === 'POST' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
												request.method === 'PUT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
												request.method === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
												'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
											}`}>
												{request.method}
											</span>
											<span className="text-sm truncate">{request.name}</span>
										</div>
									</button>
									<button
										onClick={() => onDeleteRequest(request.id)}
										className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 p-1"
										title="Delete Request"
									>
										<Trash2 size={12} />
									</button>
								</div>
							))}

							{activeCollection.requests.length === 0 && (
								<p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">
									No requests in this collection
								</p>
							)}
						</div>
					</div>
				</div>
			)}

			{!activeCollection && collections.length === 0 && (
				<div className="flex-1 flex items-center justify-center p-4">
					<p className="text-gray-500 dark:text-gray-400 text-sm text-center">
						No collections yet
					</p>
				</div>
			)}
		</div>
	);
}