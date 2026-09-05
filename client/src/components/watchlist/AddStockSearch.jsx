import React, { useState, useEffect, useRef, useCallback } from 'react';
import { stocksApi } from '../../services/api';

/**
 * AddStockSearch — search box with autocomplete for adding stocks to watchlist.
 */
export default function AddStockSearch({ onAdd, existingSymbols = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const data = await stocksApi.search(query.trim());
        setResults(data.results || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = useCallback(async (result) => {
    setOpen(false);
    setQuery('');
    setAddError(null);

    if (existingSymbols.includes(result.symbol)) {
      setAddError(`${result.symbol} is already in your watchlist`);
      return;
    }

    try {
      setAdding(true);
      await onAdd(result.symbol, result.name);
    } catch (err) {
      setAddError(err.message || 'Failed to add stock');
    } finally {
      setAdding(false);
    }
  }, [onAdd, existingSymbols]);

  // Allow typing a symbol directly and pressing Enter
  const handleKeyDown = useCallback(async (e) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      if (results.length > 0) {
        await handleSelect(results[0]);
      } else {
        // Try adding the typed symbol directly
        setOpen(false);
        setAddError(null);
        const sym = query.trim().toUpperCase();
        if (existingSymbols.includes(sym)) {
          setAddError(`${sym} is already in your watchlist`);
          return;
        }
        try {
          setAdding(true);
          await onAdd(sym, sym);
          setQuery('');
        } catch (err) {
          setAddError(err.message || 'Failed to add stock');
        } finally {
          setAdding(false);
        }
      }
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  }, [query, results, onAdd, existingSymbols, handleSelect]);

  return (
    <div className="add-stock-search">
      <div className="search-input-wrapper">
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          ref={inputRef}
          id="add-stock-input"
          type="text"
          className="search-input"
          placeholder="Search ticker or company name (e.g. AAPL, Tesla)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          disabled={adding}
          autoComplete="off"
          aria-label="Search for stocks to add"
          aria-expanded={open}
          aria-controls="search-results-dropdown"
        />
        {(searching || adding) && (
          <span className="search-spinner" aria-hidden="true">⟳</span>
        )}
      </div>

      {addError && (
        <p className="search-error" role="alert">{addError}</p>
      )}

      {open && results.length > 0 && (
        <ul
          ref={dropdownRef}
          id="search-results-dropdown"
          className="search-dropdown"
          role="listbox"
          aria-label="Search results"
        >
          {results.map((r) => {
            const alreadyAdded = existingSymbols.includes(r.symbol);
            return (
              <li
                key={r.symbol}
                className={`search-result-item ${alreadyAdded ? 'search-result-item--added' : ''}`}
                role="option"
                aria-selected={alreadyAdded}
                onClick={() => !alreadyAdded && handleSelect(r)}
              >
                <div className="result-symbol">{r.symbol}</div>
                <div className="result-name">{r.name}</div>
                {alreadyAdded && <span className="result-tag">Added</span>}
              </li>
            );
          })}
        </ul>
      )}

      {open && results.length === 0 && !searching && query.length > 0 && (
        <div className="search-no-results">
          No results for "<strong>{query}</strong>". Try a different ticker or press Enter to add it directly.
        </div>
      )}
    </div>
  );
}
