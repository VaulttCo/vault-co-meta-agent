import type { UserRole } from "./types";

export interface Permissions {
  // Navigation
  canViewDashboard: boolean;
  canViewClients: boolean;
  canViewCampaigns: boolean;
  canViewAiBuilder: boolean;
  canViewCreatives: boolean;
  canViewAnalytics: boolean;
  canViewReports: boolean;
  canViewApprovals: boolean;
  canViewSettings: boolean;
  // Actions
  canEditClients: boolean;
  canGenerateCampaigns: boolean;
  canSubmitForApproval: boolean;
  canApproveCampaigns: boolean;   // Admin only
  canMarkReadyForMeta: boolean;   // Admin only
  canApproveCreatives: boolean;   // Admin only
  canManageSettings: boolean;     // Admin only
  canConnectIntegrations: boolean;// Admin only
  // Data visibility
  canViewInternalNotes: boolean;
  canViewStrategyData: boolean;
  // File storage
  canUploadFiles: boolean;
  canDeleteFiles: boolean;
  canViewClientFiles: boolean;
}

const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
  admin: {
    canViewDashboard: true,
    canViewClients: true,
    canViewCampaigns: true,
    canViewAiBuilder: true,
    canViewCreatives: true,
    canViewAnalytics: true,
    canViewReports: true,
    canViewApprovals: true,
    canViewSettings: true,
    canEditClients: true,
    canGenerateCampaigns: true,
    canSubmitForApproval: true,
    canApproveCampaigns: true,
    canMarkReadyForMeta: true,
    canApproveCreatives: true,
    canManageSettings: true,
    canConnectIntegrations: true,
    canViewInternalNotes: true,
    canViewStrategyData: true,
    canUploadFiles: true,
    canDeleteFiles: true,
    canViewClientFiles: true,
  },
  media_buyer: {
    canViewDashboard: true,
    canViewClients: true,
    canViewCampaigns: true,
    canViewAiBuilder: true,
    canViewCreatives: true,
    canViewAnalytics: true,
    canViewReports: true,
    canViewApprovals: true,
    canViewSettings: true,
    canEditClients: false,
    canGenerateCampaigns: true,
    canSubmitForApproval: true,
    canApproveCampaigns: false,
    canMarkReadyForMeta: false,
    canApproveCreatives: false,
    canManageSettings: false,
    canConnectIntegrations: false,
    canViewInternalNotes: true,
    canViewStrategyData: true,
    canUploadFiles: true,
    canDeleteFiles: false,
    canViewClientFiles: true,
  },
  setter: {
    canViewDashboard: true,
    canViewClients: true,
    canViewCampaigns: true,
    canViewAiBuilder: false,
    canViewCreatives: false,
    canViewAnalytics: false,
    canViewReports: false,
    canViewApprovals: false,
    canViewSettings: false,
    canEditClients: false,
    canGenerateCampaigns: false,
    canSubmitForApproval: false,
    canApproveCampaigns: false,
    canMarkReadyForMeta: false,
    canApproveCreatives: false,
    canManageSettings: false,
    canConnectIntegrations: false,
    canViewInternalNotes: false,
    canViewStrategyData: false,
    canUploadFiles: false,
    canDeleteFiles: false,
    canViewClientFiles: true,
  },
  client_viewer: {
    canViewDashboard: false,
    canViewClients: false,
    canViewCampaigns: false,
    canViewAiBuilder: false,
    canViewCreatives: false,
    canViewAnalytics: false,
    canViewReports: true,
    canViewApprovals: false,
    canViewSettings: false,
    canEditClients: false,
    canGenerateCampaigns: false,
    canSubmitForApproval: false,
    canApproveCampaigns: false,
    canMarkReadyForMeta: false,
    canApproveCreatives: false,
    canManageSettings: false,
    canConnectIntegrations: false,
    canViewInternalNotes: false,
    canViewStrategyData: false,
    canUploadFiles: false,
    canDeleteFiles: false,
    canViewClientFiles: false,
  },
};

export function getPermissions(role: UserRole): Permissions {
  return ROLE_PERMISSIONS[role];
}

export function can(role: UserRole, permission: keyof Permissions): boolean {
  return ROLE_PERMISSIONS[role][permission];
}
