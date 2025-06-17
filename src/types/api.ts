export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface RequestHeader {
	key: string;
	value: string;
	enabled: boolean;
}

export interface QueryParam {
	key: string;
	value: string;
	enabled: boolean;
}

export interface ApiRequest {
	id: string;
	name: string;
	method: HttpMethod;
	url: string;
	headers: RequestHeader[];
	queryParams: QueryParam[];
	body?: {
		type: 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw';
		content: string;
	};
	auth?: {
		type: 'none' | 'bearer' | 'basic' | 'api-key';
		bearerToken?: string;
		basicAuth?: { username: string; password: string };
		apiKey?: { key: string; value: string; in: 'header' | 'query' };
	};
	createdAt: string;
	updatedAt: string;
}

export interface ApiResponse {
	status: number;
	statusText: string;
	headers: Record<string, string>;
	data: any;
	responseTime: number;
	size: number;
	timestamp: string;
}

export interface Collection {
	id: string;
	name: string;
	description?: string;
	requests: ApiRequest[];
	variables?: Record<string, string>;
	createdAt: string;
	updatedAt: string;
}

export interface AppSettings {
	theme: 'light' | 'dark' | 'system';
	defaultTimeout: number;
	followRedirects: boolean;
	validateCertificates: boolean;
	maxResponseSize: number;
}

export interface RequestHistory {
	id: string;
	request: ApiRequest;
	response: ApiResponse;
	timestamp: string;
}

export interface CollectionExport {
	version: string;
	collection: Omit<Collection, 'id'>;
	exportedAt: string;
}