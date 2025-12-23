import React, { useState, useEffect } from "react";
import { GlobalProvider, useGlobalContext } from "../globalContext";
import "../TableStyles.css";
import "../analsticsOnResult.css";
import "../CreateTemplate.css";

// Toast Component
const Toast = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}>
          <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {toast.type === 'error' && <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>}
            {toast.type === 'success' && <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>}
            {toast.type === 'warning' && <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>}
            {toast.type === 'info' && <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>}
          </svg>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

// Skeleton Loader Components
const SkeletonCard = () => (
    <div className="result-card skeleton-card">
        <div className="result-card__header">
            <span className="skeleton-line skeleton-date"></span>
            <span className="skeleton-line skeleton-status"></span>
        </div>
        <div className="result-card__content">
            <div className="skeleton-line skeleton-title"></div>
            <div className="skeleton-line skeleton-text"></div>
            <div className="skeleton-line skeleton-text-short"></div>
        </div>
    </div>
);

const SkeletonTableRow = () => (
    <tr className="skeleton-row">
        <td><div className="skeleton-line skeleton-cell"></div></td>
        <td><div className="skeleton-line skeleton-cell"></div></td>
        <td><div className="skeleton-line skeleton-cell-wide"></div></td>
        <td><div className="skeleton-line skeleton-cell-wide"></div></td>
        <td><div className="skeleton-line skeleton-cell-short"></div></td>
        <td><div className="skeleton-line skeleton-cell-icon"></div></td>
    </tr>
);

// Loading Overlay Component
const LoadingOverlay = () => (
    <div className="loading-overlay">
        <div className="loading-spinner">
            <svg className="spinner-icon" viewBox="0 0 50 50">
                <circle className="spinner-path" cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle>
            </svg>
            <span className="loading-text">Loading...</span>
        </div>
    </div>
);

const ListTestResultPage = ({ onItemClick, searchFilter, onSearchResults, onSearchChange }) => {
    const [items, setItems] = useState([]);
    const [currentPage, setCurrentPage] = useState(1); // Start from page 1
    const [lastKey, setLastKey] = useState(null);
    const [totalPages, setTotalPages] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: "datetime", direction: "asc" });
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const { globalValue, setGlobalValue } = useGlobalContext();
    // Temporary test value for debugging
    const testGlobalValue = globalValue || "test-user-id";
    const [searchName, setSearchName] = useState("");
    const [isConfirmationVisible, setIsConfirmationVisible] = useState(false); // State to manage confirmation dialog visibility
    const [isHovered, setIsHovered] = useState(false); // State to manage hover effect
    const [isDeleteClicked, setIsDeleteClicked] = useState(false); // State to manage delete button click
    const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
    const [confirmationRowIndex, setConfirmationRowIndex] = useState(null);
    const [toasts, setToasts] = useState([]);

    const pageSize = 10; // Number of items per page

    // Toast functions
    const showToast = (type, title, message) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, title, message }]);
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 300);
        }, 4000);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 300);
    };

    // Handle item click with status check
    const handleItemClick = (item) => {
        if (item.status === "Completed" || item.status === "Complete") {
            onItemClick(item.testID, item);
        } else {
            showToast("error", "Test Incomplete", "This test is not completed and therefore the report can't be generated.");
        }
    };

    useEffect(() => {
        console.log("ListTestResultPage: Initial load, testGlobalValue:", testGlobalValue);
        fetchData(true); // Fetch data when page loads (first call)
    }, []);

    useEffect(() => {
        // Handle searchFilter prop changes directly
        // Sync mobile search input with searchFilter prop
        if (searchFilter !== searchName) {
            setSearchName(searchFilter || "");
        }

        // When search filter changes, fetch from server with search term
        if (searchFilter !== undefined) {
            if (searchFilter && searchFilter.trim()) {
                // Search with server-side filtering
                fetchSearchDataWithTerm(searchFilter.trim());
            } else {
                // Clear search - reload all data
                fetchData(true);
            }
        }
    }, [searchFilter]);

    const handleDeleteTest = async (testID) => {
        setLoading(true);
        try {
            const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/deleteTestTransaction", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ testID, globalValue: testGlobalValue }),
            });

            if (response.status === 200) {
                const data = await response.json();

            } else if (response.status === 404) {
                console.warn("Error 404: Resource not found.");
            } else if (response.status === 500) {
                console.error("Error 500: Server error.");
            } else {
                console.warn(`Unexpected status code: ${response.status}`);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            // Network or parsing error
        } finally {
            setLoading(false); // Reset loading state
        }
    };


    // Fetch data until we have enough items for the target page
    const fetchDataUntilPage = async (targetPage) => {
        if (loading) return false;
        
        const requiredItems = targetPage * pageSize;
        let currentItems = items;
        let currentLastKey = lastKey;
        let currentHasMore = hasMore;
        
        // If we already have enough items, no need to fetch
        if (currentItems.length >= requiredItems || !currentHasMore) {
            return true;
        }
        
        setLoading(true);
        let allNewItems = [];
        
        try {
            while (currentItems.length + allNewItems.length < requiredItems && currentHasMore) {
                const requestBody = {
                    globalValue: testGlobalValue,
                    pageSize,
                    lastKey: currentLastKey,
                    sortKey: sortConfig.key,
                    sortDirection: sortConfig.direction
                };
                
                const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/listTestsWithStatus", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                });
                
                const data = await response.json();
                const parsedBody = typeof data.body === "string" ? JSON.parse(data.body) : data.body;
                const newItems = parsedBody.items || [];
                
                if (newItems.length === 0) break;
                
                allNewItems = [...allNewItems, ...newItems];
                currentLastKey = parsedBody.last_key;
                currentHasMore = parsedBody.has_more;
            }
            
            if (allNewItems.length > 0) {
                setItems(prevItems => [...prevItems, ...allNewItems]);
                setLastKey(currentLastKey);
                setHasMore(currentHasMore);
            }
            
            setLoading(false);
            return true;
        } catch (error) {
            console.error("Error fetching data for page:", error);
            setLoading(false);
            return false;
        }
    };

    const fetchData = async (isFirstLoad = false) => {
        // Allow fresh loads even when hasMore is false, but prevent loading when already loading
        if (loading || (!isFirstLoad && !hasMore)) return false;

        console.log("fetchData called, isFirstLoad:", isFirstLoad, "testGlobalValue:", testGlobalValue);
        setLoading(true); // Indicate fetching state

        try {
            // Don't include searchName when fetching all data (when search is cleared)
            const requestBody = {
                globalValue: testGlobalValue,
                pageSize,
                lastKey: isFirstLoad ? null : lastKey,
                sortKey: sortConfig.key,
                sortDirection: sortConfig.direction
            };

            console.log("Making API call with requestBody:", requestBody);
            const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/listTestsWithStatus", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            console.log("API response status:", response.status);
            const data = await response.json();
            console.log("API response data:", data);

            // Ensure body is properly parsed
            const parsedBody = typeof data.body === "string" ? JSON.parse(data.body) : data.body;

            const newItems = parsedBody.items || []; // Ensure items exist

            if (newItems.length === 0 && !isFirstLoad) {
                setLoading(false);
                return false; // Don't update if no new data
            }

            setItems(prevItems => isFirstLoad ? newItems : [...prevItems, ...newItems]); // Append new data
            setLastKey(parsedBody.last_key);
            setHasMore(parsedBody.has_more);
            setTotalPages(Math.ceil(parsedBody.total_count / pageSize));

            // Reset pagination state when loading fresh data
            if (isFirstLoad) {
                setCurrentPage(1);
            }

            setLoading(false);
            return true;
        } catch (error) {
            console.error("Error fetching data:", error);

            // Add mock data for testing when API fails
            if (isFirstLoad) {
                console.log("Adding mock data for testing");
                const mockData = [
                    {
                        datetime: new Date().toISOString(),
                        candidateName: "John Doe",
                        templateName: "JavaScript Assessment",
                        testID: "test-123-456",
                        status: "Completed"
                    },
                    {
                        datetime: new Date(Date.now() - 86400000).toISOString(),
                        candidateName: "Jane Smith",
                        templateName: "React Developer Test",
                        testID: "test-789-012",
                        status: "Terminated"
                    }
                ];
                setItems(mockData);
                setTotalPages(1);
                setCurrentPage(1);
                setHasMore(false);
            }
            setLoading(false);
            return false;
        }
    };

    const fetchSearchData = async () => {
        setLoading(true); // Indicate fetching state

        try {
            const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/listTestsWithStatus", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    globalValue: testGlobalValue, 
                    pageSize, 
                    lastKey: null, 
                    searchName,
                    sortKey: sortConfig.key,
                    sortDirection: sortConfig.direction
                }),
            });

            const data = await response.json();

            // Ensure body is properly parsed
            const parsedBody = typeof data.body === "string" ? JSON.parse(data.body) : data.body;

            const newItems = parsedBody.items || []; // Ensure items exist

            setItems(newItems); // Replace data with search results
            setLastKey(parsedBody.last_key);
            setHasMore(parsedBody.has_more);
            setTotalPages(Math.ceil(parsedBody.total_count / pageSize));
            setCurrentPage(1); // Reset to first page for search results
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false); // Reset loading state
        }
    };

    // Fetch search results from server with a specific search term
    const fetchSearchDataWithTerm = async (searchTerm) => {
        setLoading(true);

        try {
            const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/listTestsWithStatus", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    globalValue: testGlobalValue, 
                    pageSize, 
                    lastKey: null, 
                    searchName: searchTerm,
                    sortKey: sortConfig.key,
                    sortDirection: sortConfig.direction
                }),
            });

            const data = await response.json();
            const parsedBody = typeof data.body === "string" ? JSON.parse(data.body) : data.body;
            const newItems = parsedBody.items || [];

            setItems(newItems);
            setLastKey(parsedBody.last_key);
            setHasMore(parsedBody.has_more);
            setTotalPages(Math.ceil(parsedBody.total_count / pageSize));
            setCurrentPage(1);

            // Notify parent component about search results
            if (onSearchResults) {
                onSearchResults(newItems);
            }
        } catch (error) {
            console.error("Error fetching search data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Get items - filtering is now done server-side
    const getFilteredItems = () => {
        return items;
    };

    // Sorting function - triggers server-side sort
    const handleSort = async (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        const newSortConfig = { key, direction };
        setSortConfig(newSortConfig);
        
        // Fetch data with new sort configuration from server
        await fetchDataWithSort(newSortConfig);
    };

    // Fetch data with sort configuration
    const fetchDataWithSort = async (sortCfg) => {
        setLoading(true);
        
        try {
            const requestBody = {
                globalValue: testGlobalValue,
                pageSize,
                lastKey: null, // Reset to first page when sorting
                sortKey: sortCfg.key,
                sortDirection: sortCfg.direction
            };

            // Include search term if active
            if (searchName && searchName.trim()) {
                requestBody.searchName = searchName.trim();
            }

            const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/listTestsWithStatus", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();
            const parsedBody = typeof data.body === "string" ? JSON.parse(data.body) : data.body;
            const newItems = parsedBody.items || [];

            setItems(newItems);
            setLastKey(parsedBody.last_key);
            setHasMore(parsedBody.has_more);
            setTotalPages(Math.ceil(parsedBody.total_count / pageSize));
            setCurrentPage(1); // Reset to first page
        } catch (error) {
            console.error("Error fetching sorted data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Items are already sorted by the server, no client-side sorting needed
    const filteredItems = getFilteredItems();
    const sortedItems = filteredItems;

    // Update total pages based on server total or loaded items when no more data available
    const filteredTotalPages = hasMore 
        ? Math.max(1, totalPages)
        : Math.max(1, Math.ceil(items.length / pageSize));

    // Pagination logic
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedItems = sortedItems.slice(startIndex, startIndex + pageSize);

    const handleNextPage = async () => {
        const nextPage = currentPage + 1;
        const requiredItems = nextPage * pageSize;

        // Check if we need to fetch more data from server
        if (requiredItems > items.length && hasMore && !loading) {
            const success = await fetchData(false);
            // Only move to next page after data is fetched
            if (success && nextPage <= filteredTotalPages) {
                setCurrentPage(nextPage);
            }
        } else if (nextPage <= filteredTotalPages) {
            // Data already loaded, just change page
            setCurrentPage(nextPage);
        }
    };

    const handleCancelRowIndex = () => {
        setConfirmationRowIndex(null);
        setIsDeleteClicked(false);
    }

    const handleOKRowIndex = (index) => {
        setIsDeleteClicked(false);
        setConfirmationRowIndex(null);
        handleDeleteTest(index);

        // Remove the item from the list
        setItems((prevItems) => {
            const updatedItems = prevItems.filter((item) => item.testID !== index);

            // Update total pages based on new item count
            const newTotalPages = Math.max(1, Math.ceil(updatedItems.length / pageSize));
            setTotalPages(newTotalPages);

            // If current page is now empty and it's not the first page, go to previous page
            const startIndex = (currentPage - 1) * pageSize;
            const itemsOnCurrentPage = updatedItems.slice(startIndex, startIndex + pageSize).length;

            if (itemsOnCurrentPage === 0 && currentPage > 1) {
                setCurrentPage(currentPage - 1);
            } else if (currentPage > newTotalPages) {
                setCurrentPage(newTotalPages);
            }

            return updatedItems;
        });
    }

    const handleConfirmationRowIndex = (index) => {
        if (!isDeleteClicked) {
            setConfirmationRowIndex(index);
            setIsDeleteClicked(true);
        }
    }

    return (
        <div className="results-page">
            {/* Loading Overlay - shows when fetching data with existing items */}
            {loading && items.length > 0 && <LoadingOverlay />}
            
            {/* Mobile Search Panel */}
            <div className="mobile-search-panel">
                <div className="mobile-search-container">
                    <button className="mobile-back-btn" onClick={() => window.history.back()}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5" />
                            <path d="M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="mobile-search-input-container">
                        <input
                            type="text"
                            placeholder="Candidate name or Test ID"
                            className="mobile-search-input"
                            value={searchName}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSearchName(value);
                                // Notify parent component about search change
                                if (onSearchChange) {
                                    onSearchChange(value);
                                }
                            }}
                        />
                    </div>
                    <button className="mobile-refresh-btn" onClick={() => fetchData(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="1 4 1 10 7 10" />
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Card Layout */}
            <div className="mobile-results">
                <div className="results-grid">
                    {loading && items.length === 0 ? (
                        // Skeleton loader for mobile cards
                        <>
                            {[...Array(5)].map((_, index) => (
                                <SkeletonCard key={index} />
                            ))}
                        </>
                    ) : paginatedItems.length > 0 ? (
                        paginatedItems.map((item, index) => (
                            <div key={index} className="result-card"
                                onClick={() => handleItemClick(item)}>
                                <div className="result-card__header">
                                    <span className="result-card__date">
                                        {new Date(item.datetime).toLocaleString()}
                                    </span>
                                    <span className={`result-card__status ${(item.status === "Completed" || item.status === "Complete") ? "status-completed" :
                                        item.status === "Terminated" ? "status-terminated" :
                                            "status-not-started"
                                        }`}>
                                        {item.status}
                                    </span>
                                </div>
                                <div className="result-card__content">
                                    <p className="result-card__title">{item.templateName}</p>
                                    <p className="result-card__candidate">Candidate: {item.candidateName}</p>
                                    <p className="result-card__id">Test ID: {item.testID}</p>
                                </div>
                                <div className="result-card__actions">
                                    {confirmationRowIndex === index ? (
                                        <div className="result-card__confirmation">
                                            <button className="button--cancel" onClick={(e) => { e.stopPropagation(); handleCancelRowIndex(); }} title="Cancel">
                                                ✕
                                            </button>
                                            <button className="button--confirm" onClick={(e) => { e.stopPropagation(); handleOKRowIndex(item.testID); }} title="Confirm delete">
                                                ✓
                                            </button>
                                        </div>
                                    ) : (
                                        <button className="result-card__delete" onClick={(e) => { e.stopPropagation(); handleConfirmationRowIndex(index); }} title="Delete test">
                                            🗑
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-results">
                            <div className="no-results__icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3>No data available</h3>
                            <p>There are no test results to display at the moment.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Desktop Table Layout */}
            <div className="desktop-results">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort("datetime")}>
                                    Date & Time {sortConfig.key === "datetime" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                                </th>
                                <th onClick={() => handleSort("candidateName")}>
                                    Candidate {sortConfig.key === "candidateName" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                                </th>
                                <th onClick={() => handleSort("templateName")}>
                                    Template Name {sortConfig.key === "templateName" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                                </th>
                                <th onClick={() => handleSort("testID")}>
                                    Test ID {sortConfig.key === "testID" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                                </th>
                                <th onClick={() => handleSort("status")}>
                                    Status {sortConfig.key === "status" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                                </th>
                                <th width="50px">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 6h18" />
                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                        <path d="M8 6V4c0-1 1-2 2-2h4c0-1 1-2 2-2v2" />
                                    </svg>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && items.length === 0 ? (
                                // Skeleton loader for table rows
                                <>
                                    {[...Array(5)].map((_, index) => (
                                        <SkeletonTableRow key={index} />
                                    ))}
                                </>
                            ) : paginatedItems.length > 0 ? (
                                paginatedItems.map((item, index) => (
                                    <tr key={index}
                                        onClick={() => handleItemClick(item)} // Check status before navigation
                                        onMouseEnter={() => { !isDeleteClicked && setHoveredRowIndex(index) }}
                                        onMouseLeave={() => { !isDeleteClicked && setHoveredRowIndex(null) }}
                                    >

                                        <td onClick={() => handleItemClick(item)}>
                                            {new Date(item.datetime).toLocaleString()}
                                        </td>
                                        <td>{item.candidateName}</td>
                                        <td>{item.templateName}</td>
                                        <td>{item.testID}</td>
                                        <td className={`status-cell ${(item.status === "Completed" || item.status === "Complete") ? "status-completed" :
                                            item.status === "Terminated" ? "status-terminated" :
                                                "status-not-started"
                                            }`}>
                                            {item.status}
                                        </td>

                                        <td className="table-actions-cell">
                                            <div className="buttons-container">
                                                {confirmationRowIndex === index ? (
                                                    /* Confirmation mode - OK and Cancel buttons always visible and horizontally aligned */
                                                    <div className="buttons-always-visible">
                                                        <button className="button--cancel" onClick={(e) => { e.stopPropagation(); handleCancelRowIndex(); }} title="Cancel">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                                <line x1="6" y1="6" x2="18" y2="18" />
                                                            </svg>
                                                        </button>
                                                        <button className="button--confirm" onClick={(e) => { e.stopPropagation(); handleOKRowIndex(item.testID); }} title="Confirm delete">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                                                                <polyline points="20,6 9,17 4,12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    /* Normal mode - Delete button only visible on hover */
                                                    <div className={`buttons-hover ${hoveredRowIndex === index ? "visible" : "hidden"}`}>
                                                        <button className="button--delete" onClick={(e) => { e.stopPropagation(); handleConfirmationRowIndex(index); }} title="Delete test">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M3 6h18" />
                                                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                                <path d="M8 6V4c0-1 1-2 2-2h4c0-1 1-2 2-2v2" />
                                                                <line x1="10" y1="11" x2="10" y2="17" />
                                                                <line x1="14" y1="11" x2="14" y2="17" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="no-data-cell">
                                        <div className="no-results-table">
                                            <div className="no-results__icon">
                                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <h3>No data available</h3>
                                            <p>There are no test results to display at the moment.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            <div className="pagination" role="navigation" aria-label="Pagination Navigation">
                <button
                    className="pagination-btn pagination-prev"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    aria-label="Go to previous page"
                    title="Previous page"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>

                {/* Page Numbers */}
                <div className="pagination-numbers">
                    {Array.from({ length: Math.min(filteredTotalPages, 5) }, (_, i) => {
                        let pageNum;
                        if (filteredTotalPages <= 5) {
                            pageNum = i + 1;
                        } else if (currentPage <= 3) {
                            pageNum = i + 1;
                        } else if (currentPage >= filteredTotalPages - 2) {
                            pageNum = filteredTotalPages - 4 + i;
                        } else {
                            pageNum = currentPage - 2 + i;
                        }

                        return (
                            <button
                                key={pageNum}
                                className={`pagination-btn pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                                onClick={async () => {
                                    // Check if we need to fetch more data from server
                                    const requiredItems = pageNum * pageSize;
                                    if (requiredItems > items.length && hasMore && !loading) {
                                        // Fetch all required data for the target page
                                        await fetchDataUntilPage(pageNum);
                                    }
                                    setCurrentPage(pageNum);
                                }}
                                aria-label={`Go to page ${pageNum}`}
                                aria-current={currentPage === pageNum ? 'page' : undefined}
                                title={`Page ${pageNum}`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                <button
                    className="pagination-btn pagination-next"
                    onClick={handleNextPage}
                    disabled={currentPage >= filteredTotalPages}
                    aria-label="Go to next page"
                    title="Next page"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </button>
            </div>

            {/* Toast notification */}
            <Toast toasts={toasts} removeToast={removeToast} />
        </div>
    );
};

export default ListTestResultPage;
