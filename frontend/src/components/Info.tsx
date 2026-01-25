import { styled } from "@mui/material";
import Tooltip, { TooltipProps, tooltipClasses } from "@mui/material/Tooltip";
import { ReactNode } from "react";
import { InfoType } from "../types/ComponentType";

export default function Info({ title, iconStyle }: InfoType) {
  const Info = styled(({ className, ...props }: TooltipProps) => (
    <Tooltip {...props} classes={{ popper: className }} />
  ))(({ theme }) => ({
    [`& .${tooltipClasses.tooltip}`]: {
      backgroundColor: "var(--milk-white)",
      color: "var(--caramel-brown)",
      maxWidth: 220,
      fontFamily: "Segoe UI",
      fontSize: theme.typography.pxToRem(12),
    },
  }));
  return (
    <Info title={title}>
      <i className="fa-solid fa-circle-info" style={iconStyle}></i>
    </Info>
  );
}
