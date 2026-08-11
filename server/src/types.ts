export type DataCenter = 'com' | 'eu' | 'in' | 'au' | 'jp' | 'uk' | 'ca' | 'cn';

export interface SdpSettings {
  dataCenter: DataCenter;
  portalName: string; // SDP Cloud portal/instance name, used to build ticket deep-links
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  configured: boolean;
}

export interface PublicSdpSettings extends Omit<SdpSettings, 'clientSecret' | 'refreshToken'> {
  clientSecretSet: boolean;
  refreshTokenSet: boolean;
}

export interface SdpTechnician {
  id: string;
  name: string;
  email?: string;
}

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

export interface RequestsQuery {
  page?: number;
  pageSize?: number;
  technicianId?: string;
  status?: string;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CloseRequestPayload {
  resolution: string;
  category?: string;
  subcategory?: string;
  item?: string;
  closureCode?: string;
}
