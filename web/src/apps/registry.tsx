import { lazy, type ComponentType } from "react";
import {
  LayoutDashboard, HardDrive, FolderOpen, Container, Users,
  ScrollText, Settings, Info, Share2, Bell, Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AppRegistration {
  id: string;
  titleKey: string;
  icon: LucideIcon;
  component: ComponentType;
  defaultWidth?: number;
  defaultHeight?: number;
  singleton?: boolean;
}

const DashboardApp = lazy(() => import("@/pages/dashboard"));
const SystemApp = lazy(() => import("@/pages/system"));
const StorageApp = lazy(() => import("@/pages/storage"));
const SharesApp = lazy(() => import("@/pages/shares"));
const FilesApp = lazy(() => import("@/pages/files"));
const DockerApp = lazy(() => import("@/pages/docker"));
const UsersApp = lazy(() => import("@/pages/users"));
const LogsApp = lazy(() => import("@/pages/logs"));
const AlertsApp = lazy(() => import("@/pages/alerts"));
const RecycleApp = lazy(() => import("@/pages/recycle"));
const SettingsApp = lazy(() => import("@/pages/settings"));

export const appRegistry: AppRegistration[] = [
  { id: "dashboard", titleKey: "nav.dashboard", icon: LayoutDashboard, component: DashboardApp, singleton: true },
  { id: "system", titleKey: "nav.system", icon: Info, component: SystemApp },
  { id: "storage", titleKey: "nav.storage", icon: HardDrive, component: StorageApp },
  { id: "shares", titleKey: "nav.shares", icon: Share2, component: SharesApp },
  { id: "files", titleKey: "nav.files", icon: FolderOpen, component: FilesApp, defaultWidth: 1000, defaultHeight: 650 },
  { id: "docker", titleKey: "nav.docker", icon: Container, component: DockerApp },
  { id: "users", titleKey: "nav.users", icon: Users, component: UsersApp },
  { id: "logs", titleKey: "nav.logs", icon: ScrollText, component: LogsApp },
  { id: "alerts", titleKey: "nav.alerts", icon: Bell, component: AlertsApp },
  { id: "recycle", titleKey: "nav.recycle", icon: Trash2, component: RecycleApp },
  { id: "settings", titleKey: "nav.settings", icon: Settings, component: SettingsApp },
];

export function getAppById(appId: string): AppRegistration | undefined {
  return appRegistry.find((a) => a.id === appId);
}
