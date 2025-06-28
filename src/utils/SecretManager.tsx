import { invoke } from '@tauri-apps/api/core';

export interface SecretReference {
	id: string;
	name: string;
	type: 'api-key' | 'bearer-token' | 'basic-auth' | 'oauth' | 'custom';
	createdAt: string;
	lastUsed?: string;
}

export interface SecretValue {
	id: string;
	value: string;
	expiresAt?: string;
}

export interface EncryptedExportOptions {
	includeSecrets: boolean;
	password?: string;
	secretReferences?: boolean; // Export only references, not values
}

export class SecretManager {
	private static instance: SecretManager;
	private secretCache = new Map<string, SecretValue>();
	private cacheTimeout = 5 * 60 * 1000; // 5 minutes

	private constructor() {
		// Clear cache periodically
		setInterval(() => this.clearExpiredSecrets(), 60000);
	}

	static getInstance(): SecretManager {
		if (!SecretManager.instance) {
			SecretManager.instance = new SecretManager();
		}
		return SecretManager.instance;
	}

	/**
	 * Store secrets using platform keychain, shhhh!
	 */
	async storeSecret(secret: {
		id: string;
		name: string;
		value: string;
		type: SecretReference['type'];
	}): Promise<void> {
		try {
			// Store in platform keychain via Tauri
			await invoke('store_secret', {
				id: secret.id,
				name: secret.name,
				value: secret.value,
				secretType: secret.type
			});

			// Store reference in application storage
			const reference: SecretReference = {
				id: secret.id,
				name: secret.name,
				type: secret.type,
				createdAt: new Date().toISOString()
			};

			const referenceForRust = {
				id: reference.id,
				name: reference.name,
				type: reference.type,
				created_at: reference.createdAt,
				last_used: reference.lastUsed || null
			};

			await invoke('store_secret_reference', { reference: referenceForRust });
			
			// Clear from memory immediately
			this.clearSecretFromMemory(secret.id);
		} catch (error) {
			console.error('Failed to store secret:', error);
			throw new Error('Failed to store secret securely');
		}
	}

	/**
	 * Retrieve a secret with automatic cleanup
	 */
	async getSecret(secretId: string): Promise<string | null> {
		try {
			// Check cache first (with expiration)
			const cached = this.secretCache.get(secretId);
			if (cached && (!cached.expiresAt || new Date(cached.expiresAt) > new Date())) {
				// Update last used
				await this.updateSecretLastUsed(secretId);
				return cached.value;
			}

			// Retrieve from secure storage
			const secretValue = await invoke<string>('get_secret', { secretId });
			
			if (secretValue) {
				// Cache temporarily with expiration
				this.secretCache.set(secretId, {
					id: secretId,
					value: secretValue,
					expiresAt: new Date(Date.now() + this.cacheTimeout).toISOString()
				});

				// Update last used
				await this.updateSecretLastUsed(secretId);

				// Schedule cleanup
				setTimeout(() => this.clearSecretFromMemory(secretId), this.cacheTimeout);
				
				return secretValue;
			}
			
			return null;
		} catch (error) {
			console.error('Failed to retrieve secret:', error);
			return null;
		}
	}

	/**
	 * Get all secret references (not values)
	 */
	async getSecretReferences(): Promise<SecretReference[]> {
		try {
			return await invoke<SecretReference[]>('get_secret_references');
		} catch (error) {
			console.error('Failed to get secret references:', error);
			return [];
		}
	}

	/**
	 * Delete a secret permanently
	 */
	async deleteSecret(secretId: string): Promise<void> {
		try {
			await invoke('delete_secret', { secretId });
			await invoke('delete_secret_reference', { secretId });
			this.clearSecretFromMemory(secretId);
		} catch (error) {
			console.error('Failed to delete secret:', error);
			throw new Error('Failed to delete secret');
		}
	}

	/**
	 * Export collections with secret handling options
	 */
	async exportCollectionsSecurely(
		collections: any[],
		options: EncryptedExportOptions
	): Promise<string> {
		const processedCollections = await Promise.all(
			collections.map(async (collection) => {
				const processedRequests = await Promise.all(
					collection.requests.map(async (request: any) => {
						return await this.processRequestForExport(request, options);
					})
				);

				return {
					...collection,
					requests: processedRequests
				};
			})
		);

		const exportData = {
			version: '1.0',
			exportedAt: new Date().toISOString(),
			securityLevel: options.includeSecrets ? 'encrypted' : 'references-only',
			collections: processedCollections
		};

		if (options.includeSecrets && options.password) {
			// Encrypt the entire export with user password
			const encryptedData = await invoke<string>('encrypt_export', {
				data: JSON.stringify(exportData),
				password: options.password
			});
			
			return JSON.stringify({
				encrypted: true,
				data: encryptedData,
				version: '1.0'
			}, null, 4);
		}

		return JSON.stringify(exportData, null, 4);
	}

	/**
	 * Import collections with secret handling
	 */
	async importCollectionsSecurely(
		importData: string,
		decryptionPassword?: string
	): Promise<any[]> {
		let parsedData;
		
		try {
			const rawData = JSON.parse(importData);
			
			if (rawData.encrypted) {
				if (!decryptionPassword) {
					throw new Error('Encrypted import requires password');
				}
				
				const decryptedData = await invoke<string>('decrypt_import', {
					encryptedData: rawData.data,
					password: decryptionPassword
				});
				
				parsedData = JSON.parse(decryptedData);
			} else {
				parsedData = rawData;
			}
			
			// Process collections and handle secrets
			const collections = parsedData.collections || [];
			
			return await Promise.all(
				collections.map(async (collection: any) => {
					const processedRequests = await Promise.all(
						collection.requests.map(async (request: any) => {
							return await this.processRequestForImport(request);
						})
					);
					
					return {
						...collection,
						requests: processedRequests
					};
				})
			);
		} catch (error) {
			console.error('Failed to import collections:', error);
			throw new Error('Failed to import collections securely');
		}
	}

	/**
	 * Create a masked version of a secret for UI display
	 */
	maskSecret(secret: string): string {
		if (!secret || secret.length < 8) {
			return '••••••••';
		}
		
		const start = secret.substring(0, 4);
		const end = secret.substring(secret.length - 4);
		const middle = '•'.repeat(Math.min(secret.length - 8, 12));
		
		return `${start}${middle}${end}`;
	}

	/**
	 * Clear all secrets from memory
	 */
	clearAllSecrets(): void {
		for (const [secretId] of this.secretCache) {
			this.clearSecretFromMemory(secretId);
		}
		this.secretCache.clear();
	}

	private async processRequestForExport(request: any, options: EncryptedExportOptions): Promise<any> {
		const processedRequest = { ...request };

		// Handle auth secrets
		if (request.auth?.type === 'bearer' && request.auth.bearerToken) {
			if (options.includeSecrets) {
				// Keep the secret (will be encrypted at export level)
				processedRequest.auth.bearerToken = request.auth.bearerToken;
			} else if (options.secretReferences) {
				// Replace with reference
				processedRequest.auth.bearerTokenRef = await this.createSecretReference(
					request.auth.bearerToken,
					'bearer-token'
				);
				delete processedRequest.auth.bearerToken;
			} else {
				// Remove secret entirely
				delete processedRequest.auth.bearerToken;
			}
		}

		// Handle basic auth
		if (request.auth?.type === 'basic' && request.auth.basicAuth?.password) {
			if (options.includeSecrets) {
				processedRequest.auth.basicAuth.password = request.auth.basicAuth.password;
			} else if (options.secretReferences) {
				processedRequest.auth.basicAuth.passwordRef = await this.createSecretReference(
					request.auth.basicAuth.password,
					'basic-auth'
				);
				delete processedRequest.auth.basicAuth.password;
			} else {
				delete processedRequest.auth.basicAuth.password;
			}
		}

		// Handle API key auth
		if (request.auth?.type === 'api-key' && request.auth.apiKey?.value) {
			if (options.includeSecrets) {
				processedRequest.auth.apiKey.value = request.auth.apiKey.value;
			} else if (options.secretReferences) {
				processedRequest.auth.apiKey.valueRef = await this.createSecretReference(
					request.auth.apiKey.value,
					'api-key'
				);
				delete processedRequest.auth.apiKey.value;
			} else {
				delete processedRequest.auth.apiKey.value;
			}
		}

		// Handle headers with potential secrets
		if (request.headers) {
			processedRequest.headers = await Promise.all(
				request.headers.map(async (header: any) => {
					if (this.isSecretHeader(header.key)) {
						if (options.includeSecrets) {
							return header;
						} else if (options.secretReferences) {
							return {
								...header,
								valueRef: await this.createSecretReference(header.value, 'custom'),
								value: undefined
							};
						} else {
							return { ...header, value: '' };
						}
					}
					return header;
				})
			);
		}

		return processedRequest;
	}

	private async processRequestForImport(request: any): Promise<any> {
		const processedRequest = { ...request };

		// Handle auth secret references
		if (request.auth?.bearerTokenRef) {
			const secret = await this.resolveSecretReference(request.auth.bearerTokenRef);
			if (secret) {
				processedRequest.auth.bearerToken = secret;
			} else {
				// If secret reference can't be resolved, remove the auth
				console.warn('Could not resolve bearer token reference:', request.auth.bearerTokenRef);
			}
			delete processedRequest.auth.bearerTokenRef;
		}

		if (request.auth?.basicAuth?.passwordRef) {
			const secret = await this.resolveSecretReference(request.auth.basicAuth.passwordRef);
			if (secret) {
				processedRequest.auth.basicAuth.password = secret;
			} else {
				console.warn('Could not resolve basic auth password reference:', request.auth.basicAuth.passwordRef);
				// Keep the username but remove password if we can't resolve it
				delete processedRequest.auth.basicAuth.password;
			}
			delete processedRequest.auth.basicAuth.passwordRef;
		}

		if (request.auth?.apiKey?.valueRef) {
			const secret = await this.resolveSecretReference(request.auth.apiKey.valueRef);
			if (secret) {
				processedRequest.auth.apiKey.value = secret;
			} else {
				console.warn('Could not resolve API key reference:', request.auth.apiKey.valueRef);
			}
			delete processedRequest.auth.apiKey.valueRef;
		}

		// Handle header secret references
		if (request.headers) {
			processedRequest.headers = await Promise.all(
				request.headers.map(async (header: any) => {
					if (header.valueRef) {
						const secret = await this.resolveSecretReference(header.valueRef);
						return {
							...header,
							value: secret || '',
							valueRef: undefined
						};
					}
					return header;
				})
			);
		}

		return processedRequest;
	}

	private async createSecretReference(value: string, type: SecretReference['type']): Promise<string> {
		const secretId = crypto.randomUUID();
		await this.storeSecret({
			id: secretId,
			name: `Imported ${type}`,
			value,
			type
		});
		return secretId;
	}

	private async resolveSecretReference(secretRef: string): Promise<string | null> {
		try {
			return await this.getSecret(secretRef);
		} catch (error) {
			console.warn('Failed to resolve secret reference:', secretRef, error);
			return null;
		}
	}

	private isSecretHeader(headerName: string): boolean {
		const secretHeaders = [
			'authorization',
			'api-key',
			'x-api-key',
			'x-auth-token',
			'x-access-token',
			'authentication'
		];
		return secretHeaders.includes(headerName.toLowerCase());
	}

	private clearSecretFromMemory(secretId: string): void {
		const cached = this.secretCache.get(secretId);
		if (cached) {
			// Overwrite memory with random data
			cached.value = crypto.randomUUID();
			this.secretCache.delete(secretId);
		}
	}

	private clearExpiredSecrets(): void {
		const now = new Date();
		for (const [secretId, secret] of this.secretCache) {
			if (secret.expiresAt && new Date(secret.expiresAt) <= now) {
				this.clearSecretFromMemory(secretId);
			}
		}
	}

	private async updateSecretLastUsed(secretId: string): Promise<void> {
		try {
			await invoke('update_secret_last_used', {
				secretId,
				lastUsed: new Date().toISOString()
			});
		} catch (error) {
			console.warn('Failed to update secret last used:', error);
		}
	}
}