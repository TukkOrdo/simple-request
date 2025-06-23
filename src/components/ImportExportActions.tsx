import { useRef } from 'react';
import { Collection } from '../types/api';
import { Download, Upload } from 'lucide-react';

interface ImportExportActionsProps {
	collections: Collection[];
	onImport: (collections: Collection[]) => void;
	className?: string;
}

export function ImportExportActions({ collections, onImport, className = '' }: ImportExportActionsProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const exportCollections = (selectedCollections?: Collection[]) => {
		const collectionsToExport = selectedCollections || collections;
		
		if (collectionsToExport.length === 0) {
			return;
		}

		const exportData = {
			version: '1.0',
			exportedAt: new Date().toISOString(),
			collections: collectionsToExport
		};

		const dataStr = JSON.stringify(exportData, null, 4);
		const dataBlob = new Blob([dataStr], { type: 'application/json' });
		
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
		const filename = selectedCollections 
			? `${selectedCollections[0].name}-collection-${timestamp}.json`
			: `all-collections-${timestamp}.json`;
			
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const handleImportClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const importData = JSON.parse(text);
			
			let collectionsToImport: Collection[] = [];
			
			// Handle different import formats
			if (importData.collections && Array.isArray(importData.collections)) {
				collectionsToImport = importData.collections;
			} else if (Array.isArray(importData)) {
				collectionsToImport = importData;
			} else if (importData.name && importData.requests) {
				// Single collection
				collectionsToImport = [importData];
			}

			if (collectionsToImport.length > 0) {
				onImport(collectionsToImport);
			} else {
				alert('No valid collections found in the file.');
			}
		} catch (error) {
			console.error('Failed to import collections:', error);
			alert('Failed to import collections. Please check the file format.');
		}

		// Reset file input
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	return (
		<>
			<input
				ref={fileInputRef}
				type="file"
				accept=".json"
				onChange={handleFileImport}
				style={{ display: 'none' }}
			/>
			
			<div className={`import-export-actions ${className}`}>
				<button
					onClick={() => exportCollections()}
					className="icon-btn"
					title="Export All Collections"
					disabled={collections.length === 0}
				>
					<Download size={16} />
				</button>
				<button
					onClick={handleImportClick}
					className="icon-btn"
					title="Import Collections"
				>
					<Upload size={16} />
				</button>
			</div>
		</>
	);
}

export function createSingleCollectionExporter(collection: Collection) {
	return () => {
		const exportData = {
			version: '1.0',
			exportedAt: new Date().toISOString(),
			collections: [collection]
		};

		const dataStr = JSON.stringify(exportData, null, 4);
		const dataBlob = new Blob([dataStr], { type: 'application/json' });
		
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
		const filename = `${collection.name}-collection-${timestamp}.json`;
			
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};
}