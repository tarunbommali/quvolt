import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { components, cx } from '../../../styles/index';

/**
 * Command palette for quickly jumping between slides.
 * @param {{ open: boolean, slides: Array, activeIndex: number, onSelect: (index: number) => void, onClose: () => void }} props
 */
const EditorCommandPalette = ({ open, slides = [], activeIndex = 0, onSelect, onClose }) => {
    const [query, setQuery] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(0);
    const inputRef = useRef(null);

    const filtered = useMemo(() => {
        const trimmed = query.trim().toLowerCase();
        const withMeta = slides.map((slide, index) => ({
            index,
            label: `Slide ${index + 1}`,
            text: String(slide?.text || 'Untitled question'),
            optionCount: (slide?.options || []).length || 0,
        }));

        if (!trimmed) return withMeta;

        return withMeta.filter((item) => {
            const numberMatch = String(item.index + 1) === trimmed;
            return numberMatch || item.text.toLowerCase().includes(trimmed);
        });
    }, [slides, query]);

    useEffect(() => {
        if (!open) return;
        setQuery('');
        setFocusedIndex(0);
        window.setTimeout(() => inputRef.current?.focus(), 0);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        setFocusedIndex((prev) => Math.min(prev, Math.max(filtered.length - 1, 0)));
    }, [open, filtered.length]);

    if (!open) return null;

    const selectFocused = () => {
        const item = filtered[focusedIndex];
        if (!item) return;
        onSelect(item.index);
        onClose();
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setFocusedIndex((prev) => Math.min(prev + 1, Math.max(filtered.length - 1, 0)));
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setFocusedIndex((prev) => Math.max(prev - 1, 0));
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            selectFocused();
        }
    };

    return (
        <div className={components.commandPalette.overlay} onClick={onClose} role="presentation">
            <div className={components.commandPalette.wrap} onClick={(event) => event.stopPropagation()} role="presentation">
                <div className={components.commandPalette.panel}>
                    <div className={components.commandPalette.searchRow}>
                        <Search size={16} className={components.commandPalette.searchIcon} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={handleKeyDown}
                            className={components.commandPalette.searchInput}
                            placeholder="Jump to slide or search question text..."
                            aria-label="Search slides"
                        />
                        <span className={components.commandPalette.hint}>ESC</span>
                    </div>

                    <div className={components.commandPalette.list}>
                        {filtered.length ? filtered.map((item, index) => {
                            const isActiveItem = index === focusedIndex;
                            const isCurrentSlide = item.index === activeIndex;

                            return (
                                <button
                                    key={`${item.index}-${item.label}`}
                                    type="button"
                                    onMouseEnter={() => setFocusedIndex(index)}
                                    onClick={() => {
                                        onSelect(item.index);
                                        onClose();
                                    }}
                                    className={cx(
                                        components.commandPalette.item,
                                        isActiveItem ? components.commandPalette.itemActive : components.commandPalette.itemIdle,
                                    )}
                                >
                                    <div className={components.commandPalette.itemTextWrap}>
                                        <p className={components.commandPalette.itemTitle}>{item.label}</p>
                                        <p className={components.commandPalette.itemDesc}>{item.text}</p>
                                    </div>
                                    <span className={components.commandPalette.itemMeta}>
                                        {isCurrentSlide ? 'Current' : `${item.optionCount} options`}
                                    </span>
                                </button>
                            );
                        }) : (
                            <div className={components.commandPalette.empty}>No slides match your query.</div>
                        )}
                    </div>

                    <div className={components.commandPalette.footer}>
                        <span>Use arrows + Enter to jump</span>
                        <span>Ctrl+K</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditorCommandPalette;

