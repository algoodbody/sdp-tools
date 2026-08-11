export interface SdpRequest {
  id: string;
  subject: string;
  status: string;
  priority?: string;
  requester?: string;
  technician?: string;
  technicianId?: string;
  createdTime?: string;
  dueByTime?: string;
  category?: string;
  subcategory?: string;
  item?: string;
  group?: string;
  requestType?: string;
  isOverdue?: boolean;
}

export interface SdpTechnician {
  id: string;
  name: string;
  email?: string;
}

export interface RequestsResponse {
  requests: SdpRequest[];
  totalCount: number;
  mock: boolean;
}

export interface CloseTicketPayload {
  resolution: string;
  category?: string;
  subcategory?: string;
  item?: string;
  closureCode?: string;
}

export type DataCenter = 'com' | 'eu' | 'in' | 'au' | 'jp' | 'uk' | 'ca' | 'cn';

export interface PublicSettings {
  dataCenter: DataCenter;
  portalName: string;
  clientId: string;
  clientSecretSet: boolean;
  refreshTokenSet: boolean;
  configured: boolean;
}
