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
  dataValues?: Record<string, unknown>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  frameClassName?: string;
  frameStyle?: React.CSSProperties;
  title?: string;
  buttonLabel?: React.ReactNode;
  buttonTitle?: string;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  onChange?: (value: string) => void;
}

type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'token'; raw: string; variable: InputVarOption };

const TOKEN_PATTERN = /\{\{[^{}]+\}\}/g;
const DEFAULT_COLOR = '#5B8DEF';

const tokenClass =
  'inline-flex items-center gap-1 h-5 px-[7px] pl-1.5 mx-px rounded border font-mono text-xs font-semibold leading-[18px] align-middle select-none cursor-default whitespace-nowrap bg-[var(--iv-chip-bg)] border-[var(--iv-chip-border)] text-[var(--iv-chip-color)]';
const dotClass =
  'w-[5px] h-[5px] rounded-full shrink-0 bg-[var(--iv-chip-color)]';

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

const stripLineBreaks = (text: string): string => text.replace(/[\r\n]+/g, '');

const resolveDataValue = (
  values: Record<string, unknown> | undefined,
  token: string
): unknown => {
  if (!values) return undefined;
  const path = token.replace(/^\{\{|\}\}$/g, '').trim();
  if (!path) return undefined;

  return path.split('.').reduce<unknown>((current, key) => {
    if (current === null || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, values);
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
  span.className = tokenClass;

  const styles = chipVars(variable.color);
  Object.entries(styles).forEach(([key, value]) => {
    span.style.setProperty(key, String(value));
  });

  const dot = document.createElement('span');
  dot.className = dotClass;
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
    .iv-editor:empty::before {
      content: attr(data-placeholder);
      color: #9ca3af;
      pointer-events: none;
    }
    .iv-editor[data-type="input"]::-webkit-scrollbar { display: none; }
  `}</style>
);

const frameClass =
  'relative bg-white border border-gray-300 rounded-lg transition-colors focus-within:border-gray-900 focus-within:shadow-[0_0_0_3px_rgba(17,24,39,0.08)]';
const editorBaseClass =
  'font-mono text-[13.5px] text-gray-900 outline-none whitespace-pre-wrap break-words cursor-text';
const inputEditorClass =
  'pr-[118px] min-h-[38px] max-h-[38px] overflow-x-auto overflow-y-hidden block leading-5 whitespace-nowrap [scrollbar-width:none] py-[9px] px-3';
const textareaEditorClass =
  'min-h-[84px] max-h-[280px] overflow-y-auto leading-[1.75] py-[11px] px-3 flex-1';
const triggerClass =
  'appearance-none border border-gray-500 bg-white text-gray-900 hover:bg-gray-50 hover:text-black rounded-md px-[9px] h-[26px] cursor-pointer inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60';
const menuClass =
  'fixed w-[260px] max-h-[280px] overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-[0_14px_36px_rgba(15,23,42,0.18)] p-1.5 z-[9999]';
const menuTitleClass =
  'text-gray-900 text-xs font-semibold py-1.5 px-2 pb-1 border-b border-gray-200 -m-0.5 mb-1';
const menuGroupLabelClass =
  'text-[10.5px] font-semibold uppercase tracking-wide text-gray-500 px-2 pt-1.5 pb-1';
const menuItemClass =
  'w-full flex items-center gap-[7px] bg-transparent border-0 rounded-[5px] py-1.5 px-2 font-mono text-[12.5px] text-gray-800 cursor-pointer text-left hover:bg-blue-50';
const menuItemActiveClass =
  'bg-blue-50 outline outline-1 outline-blue-600/25';

export const InputVars = React.forwardRef<HTMLDivElement, InputVarsProps>(({
  type = 'input',
  value = '',
  variables = [],
  dataValues,
  placeholder = '',
  disabled = false,
  className,
  style,
  frameClassName,
  frameStyle,
  title,
  buttonLabel = <>Add context {'{{ }}'}</>,
  buttonTitle,
  buttonClassName = '',
  buttonStyle,
  onChange,
}, forwardedRef) => {
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

  const setEditorNode = (node: HTMLDivElement | null) => {
    editorRef.current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
      return;
    }
    if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

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
    const rawNext = serializeEditor(editor);
    const next = mode === 'input' ? stripLineBreaks(rawNext) : rawNext;
    if (rawNext !== next) renderValue(next);
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
    const normalizedValue = mode === 'input' ? stripLineBreaks(nextValue || '') : nextValue || '';
    const segments = parseValue(normalizedValue, variables);
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

  const handleBeforeInput = (event: React.FormEvent<HTMLDivElement>) => {
    const nativeEvent = event.nativeEvent as InputEvent;
    if (
      mode === 'input' &&
      (nativeEvent.inputType === 'insertParagraph' ||
        nativeEvent.inputType === 'insertLineBreak')
    ) {
      event.preventDefault();
    }
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
    if (mode === 'input') text = stripLineBreaks(text);
    document.execCommand('insertText', false, text);
  };

  const menu = (
    <div
      className={
        mode === 'input'
          ? 'absolute right-1.5 top-1/2 -translate-y-1/2'
          : 'inline-flex'
      }
    >
      <button
        type="button"
        className={`${triggerClass} ${buttonClassName}`}
        style={buttonStyle}
        title={buttonTitle}
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
        {buttonLabel} <span className="translate-y-px text-[9px] opacity-70">▾</span>
      </button>
      {menuOpen && createPortal(
        <div ref={menuRef} className={menuClass} role="dialog" style={menuPosition}>
          <div className={menuTitleClass}>Add context {'{{ }}'}</div>
          {groupedVariables.map(([group, groupVars]) => (
            <React.Fragment key={group}>
              {groupVars[0]?.group && (
                <div className={menuGroupLabelClass}>{groupVars[0].group}</div>
              )}
              {groupVars.map((variable) => {
                const itemIndex = flatVariables.findIndex((v) => v.value === variable.value);
                const active = itemIndex === activeIndex;
                const dataValue = resolveDataValue(dataValues, variable.value);
                return (
                <button
                  key={variable.value}
                  type="button"
                  className={`${menuItemClass} ${active ? menuItemActiveClass : ''}`}
                  title={
                    dataValue === undefined
                      ? variable.value
                      : `${variable.value}: ${String(dataValue)}`
                  }
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insertVariable(variable);
                  }}
                  onMouseEnter={() => setActiveIndex(itemIndex)}
                >
                  <span
                    className="h-[7px] w-[7px] shrink-0 rounded-full"
                    style={{ backgroundColor: normalizeHex(variable.color) }}
                  />
                  <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                    {variable.label}
                  </span>
                  {variable.type && (
                    <span
                      className="ml-auto shrink-0 rounded-full border px-1.5 py-0.5 font-sans text-[11px] font-semibold leading-none"
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
    <div ref={rootRef} className={`w-full ${className || ''}`} style={style}>
      <InputVarsStyles />
      <div
        className={`${frameClass} ${mode === 'textarea' ? 'flex flex-col' : ''} ${
          disabled ? 'opacity-55' : ''
        } ${frameClassName || ''}`}
        style={frameStyle}
        title={title}
        data-mode={mode}
      >
        <div
          ref={setEditorNode}
          className={`iv-editor ${editorBaseClass} ${
            mode === 'input' ? inputEditorClass : textareaEditorClass
          }`}
          title={title}
          data-type={mode}
          data-placeholder={placeholder}
          contentEditable={!disabled}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline={mode === 'textarea'}
          onInput={handleInput}
          onBeforeInput={handleBeforeInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => {
            if (!editorRef.current?.childNodes.length) placeCaretAtEnd(editorRef.current!);
          }}
        />
        {mode === 'textarea' ? (
          <div className="flex justify-end border-t border-gray-300 p-[5px]">{menu}</div>
        ) : (
          menu
        )}
      </div>
    </div>
  );
});

InputVars.displayName = 'InputVars';

export default InputVars;
