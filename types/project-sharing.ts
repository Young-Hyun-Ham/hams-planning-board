export type SharePermission = "view" | "edit";
export type ProjectAccessLevel = "view" | "edit" | "owner";

export type ProjectShare = {
  email: string;
  permission: SharePermission;
  addedAt: string | null;
};
