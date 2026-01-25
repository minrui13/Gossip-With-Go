import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { ModalType } from "../types/ComponentType";

export default function Modal({
  open,
  onClose,
  title = null,
  dialogId = "",
  content = null,
  action = null,
}: ModalType) {
  return (
    <Dialog open={open} onClose={onClose} id={dialogId} >
      <IconButton
        aria-label="Close"
        sx={{
          position: "absolute",
          right: 10,
          top: 10,
          color: 'var(--wood-brown)'
        }}
        onClick={onClose}
      >
        <i className="fa-solid fa-x dialog-close-icon" style={{fontSize: 17}}></i>
      </IconButton>
      {title && <DialogTitle className="dialog-title">{title}</DialogTitle>}
      {content && (
        <DialogContent className="dialog-content" style={{ backgroundColor: "#fffbf3ff" }}>
          {content}
        </DialogContent>
      )}
      {action && (
        <DialogActions className="dialog-actions" style={{ backgroundColor: "#fffbf3ff" }}>
          {action}
        </DialogActions>
      )}
    </Dialog>
  );
}
