import Quill, { Range } from "quill";
import { Delta } from "quill";
import React, { forwardRef, useEffect, useLayoutEffect, useRef } from "react";

type EditorProps = {
  readOnly?: boolean;
  defaultValue?: Delta;
  onTextChange?: (delta: Delta, oldDelta: Delta, source: string) => void;
  onSelectionChange?: (
    range: Range | null,
    oldRange: Range | null,
    source: string,
  ) => void;
};

const Editor = forwardRef<Quill | null, EditorProps>(
  (
    { readOnly = false, defaultValue, onTextChange, onSelectionChange },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const defaultValueRef = useRef(defaultValue);
    const onTextChangeRef = useRef(onTextChange);
    const onSelectionChangeRef = useRef(onSelectionChange);

    // Keep latest callbacks without re-registering listeners
    useLayoutEffect(() => {
      onTextChangeRef.current = onTextChange;
      onSelectionChangeRef.current = onSelectionChange;
    }, [onTextChange, onSelectionChange]);

    // Toggle readOnly
    useEffect(() => {
      if (ref && "current" in ref && ref.current) {
        ref.current.enable(!readOnly);
      }
    }, [readOnly, ref]);

    useEffect(() => {
      if (!containerRef.current) return;

      const editorDiv = document.createElement("div");
      containerRef.current.appendChild(editorDiv);

      const quill = new Quill(editorDiv, { theme: "snow" });

      if (typeof ref === "function") {
        ref(quill);
      } else if (ref) {
        ref.current = quill;
      }

      return () => {
        // clear ref safely
        if (typeof ref !== "function" && ref) {
          ref.current = null;
        }

        // remove ONLY what you created
        if (editorDiv.parentNode) {
          editorDiv.parentNode.removeChild(editorDiv);
        }
      };
    }, [ref]);

    useEffect(() => {
      if (!containerRef.current) return;

      const editorDiv = document.createElement("div");
      containerRef.current.appendChild(editorDiv);

      const quill = new Quill(editorDiv, {
        theme: "snow",
      });

      // Assign ref safely
      if (typeof ref === "function") {
        ref(quill);
      } else if (ref) {
        ref.current = quill;
      }

      if (defaultValueRef.current) {
        quill.setContents(defaultValueRef.current);
      }

      quill.on(Quill.events.TEXT_CHANGE, (delta, oldDelta, source) => {
        onTextChangeRef.current?.(delta, oldDelta, source);
      });

      quill.on(Quill.events.SELECTION_CHANGE, (range, oldRange, source) => {
        onSelectionChangeRef.current?.(range, oldRange, source);
      });

      return () => {
        if (typeof ref !== "function" && ref) {
          ref.current = null;
        }
        containerRef.current!.innerHTML = "";
      };
    }, [ref]);

    return <div ref={containerRef} />;
  },
);

Editor.displayName = "Editor";

export default Editor;
