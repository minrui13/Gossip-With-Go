import { ReactNode } from "react";

export type ModalType = {
  open: boolean;
  onClose: () => void;
  dialogId?: string;
  title?: ReactNode;
  content?: ReactNode;
  action?: ReactNode;
};

export type InfoType = {
  title: ReactNode;
  iconStyle: React.CSSProperties;
};

export type NavSearchOptions = {
  id: number;
  title: string;
  type: string;
};

export type LoadingType = {
  position?: "center" | "static";
  isLoading: boolean;
  style?: React.CSSProperties;
  variant?: "primary" | "success" | "danger" | "light" | "dark";
};


export type NotLoginType = {
  isShown: boolean;
  onClose: () => void;
};
