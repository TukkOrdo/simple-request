import { useRef, useState } from 'react';
import { Collection } from '../types/api';
import { SecretManager } from '../utils/SecretManager';
import { Download, Upload, Shield, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface ImportExportActionsProps {
	collections: Collection[];
	onImport: (collections: Collection[]) => void;
	className?: string;
	singleCollection?: Collection;
}

export function ImportExportActions({ 
	collections, 
	onImport, 
	className = '', 
	singleCollection 
}: ImportExportActionsProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [showExportDialog, setShowExportDialog] = useState(false);
	const [showImportPassword, setShowImportPassword] = useState(false);
	const [importPassword, setImportPassword] = useState('');
	const [importing, setImporting] = useState(false);
	const [encryptedFileContent, setEncryptedFileContent] = useState<string>('');

	const secretManager = SecretManager.getInstance();
	const exportCollections = singleCollection ? [singleCollection] : collections;

	const handleExportClick = () => {
		if (exportCollections.length === 0) return;
		setShowExportDialog(true);
	};

	const handleExport = async (options: { includeSecrets: boolean; secretReferences: boolean }, password?: string) => {
		try {
			const exportOptions = {
				...options,
				password: options.includeSecrets ? password : undefined
			};

			const exportData = await secretManager.exportCollectionsSecurely(exportCollections, exportOptions);
			
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
			const securitySuffix = exportOptions.includeSecrets ? '-encrypted' : '-safe';
			const collectionName = exportCollections.length === 1 ? exportCollections[0].name : 'all-collections';
			const filename = `${collectionName}${securitySuffix}-${timestamp}.json`;
			
			const blob = new Blob([exportData], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			
			const link = document.createElement('a');
			link.href = url;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			setShowExportDialog(false);
		} catch (error) {
			console.error('Export failed:', error);
			alert('Failed to export collections securely');
		}
	};

	const handleImportClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		console.log('File selected for import:', file.name);
		setImporting(true);
		try {
			const text = await file.text();
			const rawData = JSON.parse(text);
			
			console.log('File parsed, encrypted:', rawData.encrypted);
			if (rawData.encrypted) {
				setEncryptedFileContent(text);
				setShowImportPassword(true);
				setImporting(false);
				return;
			}

			const importedCollections = await secretManager.importCollectionsSecurely(text);
			if (importedCollections.length > 0) {
				onImport(importedCollections);
				showImportSuccess(importedCollections);
			} else {
				alert('No valid collections found in the file.');
			}
		} catch (error) {
			console.error('Import failed:', error);
			alert('Failed to import collections. Please check the file format.');
		} finally {
			setImporting(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	const handleEncryptedImport = async () => {
		if (!encryptedFileContent || !importPassword) {
			console.log('Import failed - missing file content or password:', { 
				hasFileContent: !!encryptedFileContent, 
				hasPassword: !!importPassword 
			});
			return;
		}

		console.log('Starting encrypted import...');
		setImporting(true);
		try {
			const importedCollections = await secretManager.importCollectionsSecurely(encryptedFileContent, importPassword);
			
			if (importedCollections.length > 0) {
				onImport(importedCollections);
				showImportSuccess(importedCollections);
				setShowImportPassword(false);
				setImportPassword('');
				setEncryptedFileContent('');
			} else {
				alert('No valid collections found in the file.');
			}
		} catch (error) {
			console.error('Encrypted import failed:', error);
			alert('Failed to decrypt and import collections. Please check your password.');
		} finally {
			setImporting(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	const showImportSuccess = (importedCollections: Collection[]) => {
		const totalRequests = importedCollections.reduce((sum, col) => sum + col.requests.length, 0);
		const hasSecrets = importedCollections.some(col => 
			col.requests.some(req => 
				req.auth?.bearerToken || 
				req.auth?.basicAuth?.password || 
				req.auth?.apiKey?.value
			)
		);
		
		let message = `Successfully imported ${importedCollections.length} collection(s) with ${totalRequests} request(s).`;
		if (hasSecrets) {
			message += '\n\nSecrets have been stored securely in your vault.';
		}
		
		alert(message);
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
					onClick={handleExportClick}
					className="icon-btn"
					title={singleCollection ? "Export Collection" : "Export All Collections"}
					disabled={exportCollections.length === 0}
				>
					<Upload size={16} />
				</button>
				{!singleCollection && (
					<button
						onClick={handleImportClick}
						className="icon-btn"
						title="Import Collections"
						disabled={importing}
					>
						<Download size={16} />
					</button>
				)}
			</div>

			<ExportDialog
				isOpen={showExportDialog}
				collections={exportCollections}
				onExport={handleExport}
				onCancel={() => setShowExportDialog(false)}
			/>

			{showImportPassword && (
				<ImportPasswordDialog
					password={importPassword}
					onPasswordChange={setImportPassword}
					onImport={handleEncryptedImport}
					onCancel={() => {
						setShowImportPassword(false);
						setImportPassword('');
						setEncryptedFileContent('');
						if (fileInputRef.current) {
							fileInputRef.current.value = '';
						}
					}}
					importing={importing}
				/>
			)}
		</>
	);
}

interface ExportDialogProps {
	isOpen: boolean;
	collections: Collection[];
	onExport: (options: { includeSecrets: boolean; secretReferences: boolean }, password?: string) => void;
	onCancel: () => void;
}

function ExportDialog({ isOpen, collections, onExport, onCancel }: ExportDialogProps) {
	const [options, setOptions] = useState({
		includeSecrets: false,
		secretReferences: true
	});
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [exporting, setExporting] = useState(false);

	if (!isOpen) return null;

	const isSingleCollection = collections.length === 1;
	const title = isSingleCollection 
		? `Export "${collections[0].name}"`
		: `Export ${collections.length} Collections`;

	const handleExport = async () => {
		setExporting(true);
		try {
			await onExport(options, password);
		} finally {
			setExporting(false);
			setPassword('');
			setShowPassword(false);
			setOptions({ includeSecrets: false, secretReferences: true });
		}
	};

	return (
		<div className="dialog-overlay">
			<div className="dialog-content">
				<div className="secure-export-options">
					<div className="secure-export-title">
						<Shield size={20} />
						{title}
					</div>

					<label className="export-option" htmlFor="safe-export">
						<input
							type="radio"
							id="safe-export"
							name="export-type"
							checked={!options.includeSecrets}
							onChange={() => setOptions({ 
								includeSecrets: false, 
								secretReferences: true 
							})}
						/>
						<div className="export-option-content">
							<div className="export-option-title">Safe Export (Recommended)</div>
							<div className="export-option-description">
								Exports collections without secret values. Secrets are replaced with references 
								that can be resolved when importing on the same device.
							</div>
						</div>
					</label>

					<label className="export-option" htmlFor="encrypted-export">
						<input
							type="radio"
							id="encrypted-export"
							name="export-type"
							checked={options.includeSecrets}
							onChange={() => setOptions({ 
								includeSecrets: true, 
								secretReferences: false 
							})}
						/>
						<div className="export-option-content">
							<div className="export-option-title">Encrypted Export</div>
							<div className="export-option-description">
								Exports collections with encrypted secrets. Requires a password for decryption.
								Use this when sharing between devices or team members.
							</div>
							{options.includeSecrets && (
								<>
									<div className="request-builder-password-container" style={{ marginTop: '12px' }}>
										<input
											type={showPassword ? 'text' : 'password'}
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											placeholder="Enter encryption password"
											className="request-builder-password-input"
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="request-builder-password-toggle"
										>
											{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
										</button>
									</div>
									<div className="security-warning">
										<AlertTriangle size={16} />
										<span>
											Use a strong password! This password is required to decrypt the exported data.
										</span>
									</div>
								</>
							)}
						</div>
					</label>

					<div className="form-actions">
						<button 
							type="button" 
							onClick={onCancel} 
							className="btn-secondary"
							disabled={exporting}
						>
							Cancel
						</button>
						<button 
							type="button" 
							onClick={handleExport} 
							className="btn-primary"
							disabled={exporting || (options.includeSecrets && !password.trim())}
						>
							{exporting ? 'Exporting...' : 'Export Securely'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

interface ImportPasswordDialogProps {
	password: string;
	onPasswordChange: (password: string) => void;
	onImport: () => void;
	onCancel: () => void;
	importing: boolean;
}

function ImportPasswordDialog({
	password,
	onPasswordChange,
	onImport,
	onCancel,
	importing
}: ImportPasswordDialogProps) {
	const [showPassword, setShowPassword] = useState(false);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && password.trim() && !importing) {
			console.log('Enter key pressed, calling onImport');
			onImport();
		}
	};

	const handleImportClick = () => {
		console.log('Import button clicked');
		onImport();
	};

	return (
		<div className="dialog-overlay">
			<div className="dialog-content">
				<div className="secure-export-options">
					<div className="secure-export-title">
						<Shield size={20} />
						Encrypted Import
					</div>

					<div style={{ marginBottom: '20px' }}>
						<p style={{ margin: '0 0 16px 0', lineHeight: '1.5' }}>
							This file contains encrypted secrets. Please enter the password to decrypt:
						</p>
					</div>

					<div style={{ marginBottom: '24px' }}>
						<label className="request-builder-label" style={{ display: 'block', marginBottom: '8px' }}>
							Decryption Password
						</label>
						<div className="request-builder-password-container">
							<input
								type={showPassword ? 'text' : 'password'}
								value={password}
								onChange={(e) => onPasswordChange(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Enter decryption password"
								className="request-builder-password-input"
								disabled={importing}
								autoFocus
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="request-builder-password-toggle"
								disabled={importing}
							>
								{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
							</button>
						</div>
					</div>

					<div className="form-actions">
						<button 
							type="button" 
							onClick={onCancel} 
							className="btn-secondary"
							disabled={importing}
						>
							Cancel
						</button>
						<button 
							type="button" 
							onClick={handleImportClick} 
							className="btn-primary"
							disabled={importing || !password.trim()}
						>
							{importing ? 'Importing...' : 'Decrypt & Import'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}