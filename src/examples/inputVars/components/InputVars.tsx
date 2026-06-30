import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type InputVarsType = 'input' | 'textarea';

export interface InputVarOption {
  label: string;
  value: string;
  type?: string;
  color?: string;
  group?: string;
}

interface InputVarsProps {
  type?: InputVarsType;
  value?: string;
  variables?: InputVarOption[];
  placeholder?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}

type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'token'; raw: string; variable: InputVarOption };

const TOKEN_PATTERN = /\{\{[^{}]+\}\}/g;
const DEFAULT_COLOR = '#5B8DEF';

const TYPE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  string: { bg: '#dbeafe', text: '#2563eb' },
  number: { bg: '#ede9fe', text: '#7c3aed' },
  integer: { bg: '#ede9fe', text: '#7c3aed' },
  boolean: { bg: '#dcfce7', text: '#15803d' },
  object: { bg: '#ffedd5', text: '#c2410c' },
  array: { bg: '#fce7f3', text: '#db2777' },
};

const normalizeHex = (color?: string): string => {
  if (!color) return DEFAULT_COLOR;
  const hex = color.trim();
  const shortMatch = /^#([0-9a-fA-F]{3})$/.exec(hex);
  if (shortMatch) {
    const c = shortMatch[1].split('');
    return `#${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}`;
  }
  if (/^#([0-9a-fA-F]{6})$/.test(hex)) return hex;
  return DEFAULT_COLOR;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = normalizeHex(hex);
  return [
    parseInt(normalized.slice(1, 3), 16),
    parseInt(normalized.slice(3, 5), 16),
    parseInt(normalized.slice(5, 7), 16),
  ];
};

const chipVars = (color?: string): React.CSSProperties => {
  const base = normalizeHex(color);
  const [r, g, b] = hexToRgb(base);
  return {
    '--iv-chip-color': base,
    '--iv-chip-bg': `rgba(${r}, ${g}, ${b}, 0.16)`,
    '--iv-chip-border': `rgba(${r}, ${g}, ${b}, 0.45)`,
  } as React.CSSProperties;
};

const parseValue = (value: string, variables: InputVarOption[]): Segment[] => {
  if (!value) return [];
  const byValue = new Map(variables.map((v) => [v.value, v]));
  const segments: Segment[] = [];
  let lastIndex = 0;
  TOKEN_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TOKEN_PATTERN.exec(value)) !== null) {
    const raw = match[0];
    const variable = byValue.get(raw);
    if (!variable) continue;

    if (match.index > lastIndex) {
      segments.push({ kind: 'text', text: value.slice(lastIndex, match.index) });
    }
    segments.push({ kind: 'token', raw, variable });
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < value.length) {
    segments.push({ kind: 'text', text: value.slice(lastIndex) });
  }

  return segments;
};

const serializeEditor = (root: HTMLElement): string => {
  let out = '';

  const walk = (node: ChildNode) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent || '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    if (el.dataset.ivToken === 'true') {
      out += el.dataset.ivValue || '';
      return;
    }
    if (el.tagName === 'BR') {
      out += '\n';
      return;
    }

    const isBlock = el.tagName === 'DIV' || el.tagName === 'P';
    if (isBlock && el.previousSibling !== null) out += '\n';
    el.childNodes.forEach(walk);
  };

  root.childNodes.forEach(walk);
  return out;
};

const isToken = (node: Node | null): node is HTMLElement =>
  Boolean(
    node &&
      node.nodeType === Node.ELEMENT_NODE &&
      (node as HTMLElement).dataset.ivToken === 'true'
  );

const placeCaretAfter = (node: Node) => {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
};

const placeCaretAtEnd = (root: HTMLElement) => {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
};

const textBeforeCaret = (root: HTMLElement): string => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return '';
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return '';
  const before = range.cloneRange();
  before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  return before.toString();
};

const getCaretRect = (root: HTMLElement): DOMRect => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return root.getBoundingClientRect();
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return root.getBoundingClientRect();
  return range.getClientRects()[0] || root.getBoundingClientRect();
};

const buildTokenElement = (variable: InputVarOption): HTMLSpanElement => {
  const span = document.createElement('span');
  span.setAttribute('contenteditable', 'false');
  span.setAttribute('data-iv-token', 'true');
  span.setAttribute('data-iv-value', variable.value);
  span.setAttribute('draggable', 'true');
  span.setAttribute('role', 'img');
  span.setAttribute('aria-label', `Variable: ${variable.label}`);
  span.className = 'iv-token';

  const styles = chipVars(variable.color);
  Object.entries(styles).forEach(([key, value]) => {
    span.style.setProperty(key, String(value));
  });

  const dot = document.createElement('span');
  dot.className = 'iv-token-dot';
  dot.setAttribute('aria-hidden', 'true');
  span.appendChild(dot);

  const label = document.createElement('span');
  label.textContent = variable.label;
  span.appendChild(label);
  return span;
};

const renderSegmentsInto = (root: HTMLElement, segments: Segment[]) => {
  root.replaceChildren();
  segments.forEach((segment) => {
    if (segment.kind === 'text') {
      segment.text.split('\n').forEach((line, index, lines) => {
        if (line.length > 0) root.appendChild(document.createTextNode(line));
        if (index < lines.length - 1) root.appendChild(document.createElement('br'));
      });
      return;
    }
    root.appendChild(buildTokenElement(segment.variable));
  });
};

const insertVariableAtCaret = (root: HTMLElement, variable: InputVarOption): HTMLSpanElement => {
  const selection = window.getSelection();
  const token = buildTokenElement(variable);
  const hasSelectionInRoot =
    selection &&
    selection.rangeCount > 0 &&
    root.contains(selection.getRangeAt(0).commonAncestorContainer);

  if (!hasSelectionInRoot) {
    root.appendChild(token);
    placeCaretAfter(token);
    return token;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(token);
  placeCaretAfter(token);
  return token;
};

const replaceOpenTokenAtCaret = (
  root: HTMLElement,
  variable: InputVarOption
): HTMLSpanElement | null => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;
  if (!textBeforeCaret(root).endsWith('{{')) return null;

  const replaceRange = range.cloneRange();
  replaceRange.setStart(range.startContainer, Math.max(0, range.startOffset - 2));
  replaceRange.deleteContents();
  const token = buildTokenElement(variable);
  replaceRange.insertNode(token);
  placeCaretAfter(token);
  return token;
};

const handleTokenAdjacentDeletion = (
  root: HTMLElement,
  event: React.KeyboardEvent<HTMLDivElement>
): boolean => {
  if (event.key !== 'Backspace' && event.key !== 'Delete') return false;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return false;

  const container = range.startContainer;
  const offset = range.startOffset;
  let targetToken: HTMLElement | null = null;

  if (event.key === 'Backspace') {
    if (container.nodeType === Node.TEXT_NODE && offset === 0) {
      targetToken = isToken(container.previousSibling) ? container.previousSibling : null;
    } else if (container.nodeType === Node.ELEMENT_NODE) {
      const prevChild = container.childNodes[offset - 1];
      targetToken = isToken(prevChild) ? prevChild : null;
    }
  } else {
    const textLen = container.nodeType === Node.TEXT_NODE ? (container.textContent || '').length : -1;
    if (container.nodeType === Node.TEXT_NODE && offset === textLen) {
      targetToken = isToken(container.nextSibling) ? container.nextSibling : null;
    } else if (container.nodeType === Node.ELEMENT_NODE) {
      const nextChild = container.childNodes[offset];
      targetToken = isToken(nextChild) ? nextChild : null;
    }
  }

  if (!targetToken) return false;
  event.preventDefault();
  const toFocus = targetToken.previousSibling;
  targetToken.remove();

  const newRange = document.createRange();
  if (toFocus) newRange.setStartAfter(toFocus);
  else newRange.setStart(root, 0);
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);
  return true;
};

const InputVarsStyles = () => (
  <style>{`
    .iv-root {
      width: 100%;
      --iv-panel: #ffffff;
      --iv-border: #d1d5db;
      --iv-border-strong: #6b7280;
      --iv-border-focus: #111827;
      --iv-text: #111827;
      --iv-text-dim: #374151;
      --iv-text-bright: #000000;
      --iv-placeholder: #9ca3af;
      --iv-btn-bg: #ffffff;
      --iv-btn-bg-hover: #f9fafb;
      --iv-font-mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
      --iv-font-sans: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif;
    }
    .iv-frame {
      position: relative;
      background: #ffffff;
      border: 1px solid var(--iv-border);
      border-radius: 8px;
      transition: border-color 0.12s ease, box-shadow 0.12s ease;
    }
    .iv-frame:focus-within {
      border-color: var(--iv-border-focus);
      box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
    }
    .iv-frame.is-disabled { opacity: 0.55; }
    .iv-editor {
      font-family: var(--iv-font-mono);
      font-size: 13.5px;
      line-height: 1.6;
      color: var(--iv-text);
      outline: none;
      white-space: pre-wrap;
      word-break: break-word;
      cursor: text;
      padding: 9px 12px;
    }
    .iv-editor[data-type="input"] {
      padding-right: 118px;
      min-height: 38px;
      max-height: 38px;
      overflow-x: auto;
      overflow-y: hidden;
      display: block;
      line-height: 20px;
      white-space: nowrap;
      scrollbar-width: none;
    }
    .iv-editor[data-type="input"]::-webkit-scrollbar { display: none; }
    .iv-editor[data-type="textarea"] {
      min-height: 84px;
      max-height: 280px;
      overflow-y: auto;
      padding: 11px 12px;
      line-height: 1.75;
    }
    .iv-frame[data-mode="textarea"] {
      display: flex;
      flex-direction: column;
    }
    .iv-frame[data-mode="textarea"] .iv-editor { flex: 1; }
    .iv-footer {
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid var(--iv-border);
      padding: 5px;
    }
    .iv-editor:empty::before {
      content: attr(data-placeholder);
      color: var(--iv-placeholder);
      pointer-events: none;
    }
    .iv-menu-wrap { position: relative; }
    .iv-frame[data-mode="input"] .iv-menu-wrap {
      position: absolute;
      top: 50%;
      right: 6px;
      transform: translateY(-50%);
    }
    .iv-frame[data-mode="textarea"] .iv-menu-wrap {
      display: inline-flex;
    }
    .iv-trigger {
      appearance: none;
      border: 1px solid var(--iv-border-strong);
      background: var(--iv-btn-bg);
      color: #111827;
      font-family: var(--iv-font-sans);
      font-size: 12px;
      font-weight: 500;
      border-radius: 6px;
      padding: 0 9px;
      height: 26px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    }
    .iv-trigger:hover {
      background: var(--iv-btn-bg-hover);
      color: #000000;
    }
    .iv-trigger:disabled { cursor: not-allowed; opacity: 0.6; }
    .iv-caret {
      font-size: 9px;
      transform: translateY(0.5px);
      opacity: 0.7;
    }
    .iv-token {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 20px;
      padding: 0 7px 0 6px;
      margin: 0 1px;
      border-radius: 4px;
      background: var(--iv-chip-bg, rgba(91,141,239,0.16));
      border: 1px solid var(--iv-chip-border, rgba(91,141,239,0.45));
      color: var(--iv-chip-color, #5b8def);
      font-family: var(--iv-font-mono);
      font-size: 12px;
      font-weight: 600;
      line-height: 18px;
      vertical-align: middle;
      user-select: none;
      cursor: default;
      white-space: nowrap;
    }
    .iv-token-dot {
      width: 5px;
      height: 5px;
      border-radius: 999px;
      background: var(--iv-chip-color, #5b8def);
      flex-shrink: 0;
    }
    .iv-menu {
      position: fixed;
      width: 260px;
      max-height: 280px;
      overflow-y: auto;
      background: var(--iv-panel, #161a21);
      border: 1px solid var(--iv-border, #2a2f3a);
      border-radius: 8px;
      box-shadow: 0 10px 28px rgba(0,0,0,0.3);
      padding: 6px;
      z-index: 9999;
    }
    .iv-menu.iv-menu-modal {
      background: #ffffff;
      border-color: #d8dce3;
      box-shadow: 0 14px 36px rgba(15, 23, 42, 0.18);
    }
    .iv-menu-title {
      color: var(--iv-text-bright, #f3f5f8);
      font-family: var(--iv-font-sans);
      font-size: 12px;
      font-weight: 650;
      padding: 6px 8px 5px;
      border-bottom: 1px solid var(--iv-border, #2a2f3a);
      margin: -2px -2px 4px;
    }
    .iv-menu-modal .iv-menu-title {
      color: #111827;
      border-bottom-color: #e5e7eb;
    }
    .iv-menu-group-label {
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--iv-text-dim, #828a99);
      padding: 6px 8px 3px;
    }
    .iv-menu-modal .iv-menu-group-label {
      color: #6b7280;
    }
    .iv-menu-item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 7px;
      background: transparent;
      border: none;
      border-radius: 5px;
      padding: 6px 8px;
      font-family: var(--iv-font-mono);
      font-size: 12.5px;
      color: var(--iv-text, #d3d7de);
      cursor: pointer;
      text-align: left;
    }
    .iv-menu-item-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .iv-menu-item-type {
      margin-left: auto;
      color: #6b7280;
      font-family: var(--iv-font-sans);
      font-size: 11px;
      font-weight: 650;
      line-height: 1;
      border: 1px solid #e5e7eb;
      border-radius: 999px;
      padding: 2px 6px;
      background: #f9fafb;
      flex-shrink: 0;
    }
    .iv-menu-item:hover,
    .iv-menu-item.is-active {
      background: rgba(127,127,127,0.16);
      outline: 1px solid rgba(91, 141, 239, 0.35);
    }
    .iv-menu-modal .iv-menu-item {
      color: #1f2937;
    }
    .iv-menu-modal .iv-menu-item:hover,
    .iv-menu-modal .iv-menu-item.is-active {
      background: #eff6ff;
      outline-color: rgba(37, 99, 235, 0.25);
    }
    .iv-swatch {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      flex-shrink: 0;
    }
    .iv-output {
      margin-top: 8px;
      font-family: var(--iv-font-mono);
      font-size: 12px;
      color: var(--iv-text-dim);
      white-space: pre-wrap;
      word-break: break-all;
    }
    .iv-output strong {
      color: var(--iv-text-bright);
      font-weight: 600;
    }
  `}</style>
);

export const InputVars: React.FC<InputVarsProps> = ({
  type = 'input',
  value = '',
  variables = [],
  placeholder = '',
  disabled = false,
  onChange,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string>(value);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<React.CSSProperties>({
    top: 0,
    left: 0,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const mode: InputVarsType = type === 'textarea' ? 'textarea' : 'input';

  const groupedVariables = useMemo(() => {
    const groups = new Map<string, InputVarOption[]>();
    variables.forEach((variable) => {
      const key = variable.group || normalizeHex(variable.color).toUpperCase();
      groups.set(key, [...(groups.get(key) || []), variable]);
    });
    return Array.from(groups.entries());
  }, [variables]);

  const flatVariables = useMemo(
    () => groupedVariables.flatMap(([, groupVars]) => groupVars),
    [groupedVariables]
  );

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const next = serializeEditor(editor);
    lastValueRef.current = next;
    onChange?.(next);
  };

  const openMenuNearRect = (rect: DOMRect) => {
    const width = 260;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    const top = Math.min(rect.bottom + 8, window.innerHeight - 300);
    setMenuPosition({ top: Math.max(8, top), left });
    setActiveIndex(0);
    setMenuOpen(true);
  };

  const renderValue = (nextValue: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const segments = parseValue(nextValue || '', variables);
    renderSegmentsInto(editor, segments);
  };

  useEffect(() => {
    if (value === lastValueRef.current) return;
    lastValueRef.current = value;
    renderValue(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, variables]);

  useEffect(() => {
    renderValue(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutsideClick, true);
    return () => document.removeEventListener('mousedown', onOutsideClick, true);
  }, [menuOpen]);

  const insertVariable = (variable: InputVarOption) => {
    const editor = editorRef.current;
    if (!editor || disabled) return;
    editor.focus();
    const inserted = replaceOpenTokenAtCaret(editor, variable) || insertVariableAtCaret(editor, variable);
    if (mode === 'textarea') {
      inserted.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    setMenuOpen(false);
    emitChange();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    if (!editor) return;

    if (menuOpen) {
      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowRight' ||
        event.key === 'ArrowUp' ||
        event.key === 'ArrowLeft'
      ) {
        event.preventDefault();
        const direction =
          event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
        setActiveIndex((current) => {
          if (flatVariables.length === 0) return 0;
          return (current + direction + flatVariables.length) % flatVariables.length;
        });
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const variable = flatVariables[activeIndex];
        if (variable) insertVariable(variable);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
    }

    handleTokenAdjacentDeletion(editor, event);
    if (mode === 'input' && event.key === 'Enter') event.preventDefault();
  };

  const handleInput = () => {
    const editor = editorRef.current;
    if (editor && textBeforeCaret(editor).endsWith('{{')) {
      openMenuNearRect(getCaretRect(editor));
    }
    emitChange();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    let text = event.clipboardData.getData('text/plain');
    if (mode === 'input') text = text.replace(/\r?\n/g, ' ');
    document.execCommand('insertText', false, text);
  };

  const menu = (
    <div className="iv-menu-wrap">
      <button
        type="button"
        className="iv-trigger"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          if (menuOpen) {
            setMenuOpen(false);
            return;
          }
          if (editorRef.current) {
            editorRef.current.focus();
            placeCaretAtEnd(editorRef.current);
          }
          openMenuNearRect(event.currentTarget.getBoundingClientRect());
        }}
      >
        Add context {'{{ }}'} <span className="iv-caret">▾</span>
      </button>
      {menuOpen && createPortal(
        <div ref={menuRef} className="iv-menu iv-menu-modal" role="dialog" style={menuPosition}>
          <div className="iv-menu-title">Add context {'{{ }}'}</div>
          {groupedVariables.map(([group, groupVars]) => (
            <React.Fragment key={group}>
              {groupVars[0]?.group && <div className="iv-menu-group-label">{groupVars[0].group}</div>}
              {groupVars.map((variable) => {
                const itemIndex = flatVariables.findIndex((v) => v.value === variable.value);
                const active = itemIndex === activeIndex;
                return (
                <button
                  key={variable.value}
                  type="button"
                  className={`iv-menu-item${active ? ' is-active' : ''}`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insertVariable(variable);
                  }}
                  onMouseEnter={() => setActiveIndex(itemIndex)}
                >
                  <span
                    className="iv-swatch"
                    style={{ backgroundColor: normalizeHex(variable.color) }}
                  />
                  <span className="iv-menu-item-label">{variable.label}</span>
                  {variable.type && (
                    <span
                      className="iv-menu-item-type"
                      style={{
                        backgroundColor:
                          TYPE_BADGE_COLORS[variable.type]?.bg || '#f3f4f6',
                        color:
                          TYPE_BADGE_COLORS[variable.type]?.text || '#374151',
                        borderColor:
                          TYPE_BADGE_COLORS[variable.type]?.bg || '#e5e7eb',
                      }}
                    >
                      {variable.type}
                    </span>
                  )}
                </button>
              )})}
            </React.Fragment>
          ))}
        </div>,
        document.body
      )}
    </div>
  );

  return (
    <div ref={rootRef} className="iv-root">
      <InputVarsStyles />
      <div className={`iv-frame${disabled ? ' is-disabled' : ''}`} data-mode={mode}>
        <div
          ref={editorRef}
          className="iv-editor"
          data-type={mode}
          data-placeholder={placeholder}
          contentEditable={!disabled}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline={mode === 'textarea'}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => {
            if (!editorRef.current?.childNodes.length) placeCaretAtEnd(editorRef.current!);
          }}
        />
        {mode === 'textarea' ? <div className="iv-footer">{menu}</div> : menu}
      </div>

    </div>
  );
};

export default InputVars;
