import React, { useState, useEffect, useRef } from "react";
import { useGlobalContext } from "../globalContext";
import { useLocation } from "react-router-dom";
import { useSessionHandler } from "../useSessionHandler";
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="spin-animation">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="15.7 47.1"/>
            </svg>
        </div>
    </div>
);

const ListTestResultPage = ({ onItemClick, searchFilter, onSearchResults, onSearchChange }) => {
    const [items, setItems] = useState([]);
    const [currentPage, setCurrentPage] = useState(1); // Start from page 1
    const [lastKey, setLastKey] = useState(null);
    const [totalPages, setTotalPages] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: "datetime", direction: "desc" });
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [initialized, setInitialized] = useState(false); // Track if component is initialized
    const fetchingRef = useRef(false); // Prevent concurrent API calls
    const { globalValue, setGlobalValue, JWTValue } = useGlobalContext();
    const location = useLocation();
    // Temporary test value for debugging
    const testGlobalValue = globalValue || "test-user-id";
    const [searchName, setSearchName] = useState("");
    const [searchDebounceTimer, setSearchDebounceTimer] = useState(null);
    const [isConfirmationVisible, setIsConfirmationVisible] = useState(false); // State to manage confirmation dialog visibility
    const [isHovered, setIsHovered] = useState(false); // State to manage hover effect
    const [isDeleteClicked, setIsDeleteClicked] = useState(false); // State to manage delete button click
    const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
    const [confirmationRowIndex, setConfirmationRowIndex] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [allItemsForStats, setAllItemsForStats] = useState([]); // Store all items for statistics
    const [statsLoading, setStatsLoading] = useState(false);
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(false); // Accordion state
    const [statusFilter, setStatusFilter] = useState(null); // Filter for status
    const [templateFilter, setTemplateFilter] = useState(null); // Filter for template

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

    // Session handler for unauthorized responses
    const { checkUnauthorized, checkHttpStatus } = useSessionHandler(showToast);

    // Handle item click with status check
    const handleItemClick = (item) => {
        if (item.status === "Completed" || item.status === "Complete" || item.status === "Terminated") {
            onItemClick(item.testID, item);
        } else {
            showToast("error", "Test Incomplete", "This test is not completed and therefore the report can't be generated.");
        }
    };

    useEffect(() => {
        //console.log("ListTestResultPage: Initial load, testGlobalValue:", testGlobalValue);
        if (testGlobalValue && !initialized) {
            setInitialized(true);
            fetchData(true); // Fetch data when page loads (first call)
            fetchAllItemsForStats(); // Fetch all items for statistics
        }
    }, [testGlobalValue, initialized]); // Only depend on testGlobalValue and initialized

    useEffect(() => {
        // Handle searchFilter prop changes with debouncing
        if (searchFilter !== searchName) {
            setSearchName(searchFilter || "");
        }

        // Clear existing timer
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }

        // When search filter changes, debounce the API call
        if (searchFilter !== undefined && testGlobalValue && initialized) {
            const timer = setTimeout(() => {
                if (searchFilter && searchFilter.trim()) {
                    // Search with server-side filtering
                    fetchSearchDataWithTerm(searchFilter.trim());
                    fetchAllItemsForStats(searchFilter.trim()); // Update stats for search
                } else {
                    // Clear search - reload all data
                    fetchData(true);
                    fetchAllItemsForStats(); // Reset stats to all data
                }
            }, 300); // 300ms debounce

            setSearchDebounceTimer(timer);
        }

        // Cleanup timer on unmount
        return () => {
            if (searchDebounceTimer) {
                clearTimeout(searchDebounceTimer);
            }
        };
    }, [searchFilter, testGlobalValue, initialized]); // Added initialized dependency

    // Reset page to 1 when filters change and current page exceeds total pages
    useEffect(() => {
        const filteredItemsCount = getFilteredItems().length;
        const maxPages = Math.max(1, Math.ceil(filteredItemsCount / pageSize));
        
        if (currentPage > maxPages) {
            setCurrentPage(1);
        }
    }, [statusFilter, templateFilter, items, allItemsForStats]);



    // Fetch all items for statistics across all pages
    const fetchAllItemsForStats = async (searchTerm = null) => {
        if (statsLoading) return;
        
        setStatsLoading(true);
        let allFetchedItems = [];
        let currentLastKey = null;
        let currentHasMore = true;
        
        try {
            // Fetch all items in batches
            while (currentHasMore) {
                const requestBody = {
                    globalValue: testGlobalValue,
                    pageSize: 100, // Larger page size for stats
                    lastKey: currentLastKey,
                    sortKey: sortConfig.key,
                    sortDirection: sortConfig.direction,
                    token: JWTValue
                };

                if (searchTerm) {
                    requestBody.searchName = searchTerm;
                }

                const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/listTestsWithStatus_", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                });

                const data = await response.json();
                if (checkUnauthorized(data)) {
                    setStatsLoading(false);
                    return;
                }

                const parsedBody = typeof data.body === "string" ? JSON.parse(data.body) : data.body;
                const newItems = parsedBody.items || [];
                
                if (newItems.length === 0) break;
                
                allFetchedItems = [...allFetchedItems, ...newItems];
                currentLastKey = parsedBody.last_key;
                currentHasMore = parsedBody.has_more;

                // Safety limit to prevent infinite loops
                if (allFetchedItems.length > 10000) break;
            }

            setAllItemsForStats(allFetchedItems);
        } catch (error) {
            //console.error("Error fetching all items for stats:", error);
        } finally {
            setStatsLoading(false);
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
                    sortDirection: sortConfig.direction,
                    token: JWTValue
                };
                
                const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/listTestsWithStatus_", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                });
                
                const data = await response.json();
                if (checkUnauthorized(data)) return false;
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
            //console.error("Error fetching data for page:", error);
            setLoading(false);
            return false;
        }
    };

    const fetchData = async (isFirstLoad = false) => {
        // Allow fresh loads even when hasMore is false, but prevent loading when already loading
        if (fetchingRef.current || (!isFirstLoad && !hasMore)) return false;

        //console.log("fetchData called, isFirstLoad:", isFirstLoad, "testGlobalValue:", testGlobalValue);
        fetchingRef.current = true;
        setLoading(true); // Indicate fetching state

        try {
            // Don't include searchName when fetching all data (when search is cleared)
            const requestBody = {
                globalValue: testGlobalValue,
                pageSize,
                lastKey: isFirstLoad ? null : lastKey,
                sortKey: sortConfig.key,
                sortDirection: sortConfig.direction,
                token: JWTValue
            };

            //console.log("Making API call with requestBody:", requestBody);
            const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/listTestsWithStatus_", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            //console.log("API response status:", response.status);
            const data = await response.json();
            //console.log("API response data:", data);

            if (checkUnauthorized(data)) return false;

            // Ensure body is properly parsed
            const parsedBody = typeof data.body === "string" ? JSON.parse(data.body) : data.body;

            const newItems = parsedBody.items || []; // Ensure items exist

            if (newItems.length === 0 && !isFirstLoad) {
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

            return true;
        } catch (error) {
            //console.error("Error fetching data:", error);

            // Add mock data for testing when API fails
            if (isFirstLoad) {
                //console.log("Adding mock data for testing");
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
            return false;
        } finally {
            fetchingRef.current = false;
            setLoading(false);
        }
    };

    const fetchSearchData = async () => {
        if (loading) return; // Prevent multiple simultaneous calls
        setLoading(true); // Indicate fetching state

        try {
            const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/listTestsWithStatus_", {
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
                    sortDirection: sortConfig.direction,
                    token: JWTValue
                }),
            });

            const data = await response.json();

            if (checkUnauthorized(data)) return;

            // Ensure body is properly parsed
            const parsedBody = typeof data.body === "string" ? JSON.parse(data.body) : data.body;

            const newItems = parsedBody.items || []; // Ensure items exist

            setItems(newItems); // Replace data with search results
            setLastKey(parsedBody.last_key);
            setHasMore(parsedBody.has_more);
            setTotalPages(Math.ceil(parsedBody.total_count / pageSize));
            setCurrentPage(1); // Reset to first page for search results
        } catch (error) {
            //console.error("Error fetching data:", error);
        } finally {
            setLoading(false); // Reset loading state
        }
    };

    const fetchSearchDataWithTerm = async (searchTerm) => {
        if (fetchingRef.current) return; // Prevent multiple simultaneous calls
        fetchingRef.current = true;
        setLoading(true);

        try {
            const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/listTestsWithStatus_", {
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
                    sortDirection: sortConfig.direction,
                    token: JWTValue
                }),
            });

            const data = await response.json();
            if (checkUnauthorized(data)) return;
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
            //console.error("Error fetching search data:", error);
        } finally {
            fetchingRef.current = false;
            setLoading(false);
        }
    };

    // Get items - filtering is now done client-side on all loaded data
    const getFilteredItems = () => {
        // Use allItemsForStats for filtering if available (contains all data)
        // Otherwise fallback to items (current page data)
        const sourceItems = allItemsForStats.length > 0 ? allItemsForStats : items;
        let filtered = sourceItems;
        
        // Apply status filter if set
        if (statusFilter) {
            filtered = filtered.filter(item => {
                const itemStatus = item.status === 'Complete' ? 'Completed' : item.status;
                return itemStatus === statusFilter;
            });
        }
        
        // Apply template filter if set
        if (templateFilter) {
            filtered = filtered.filter(item => {
                return item.templateName === templateFilter;
            });
        }
        
        return filtered;
    };

    // Handle status filter click from header (no template filter)
    const handleStatusFilterClick = (status, e) => {
        e.stopPropagation(); // Prevent accordion toggle
        
        // Toggle filter - if clicking same status, clear both filters
        if (statusFilter === status && !templateFilter) {
            setStatusFilter(null);
            setTemplateFilter(null);
        } else {
            setStatusFilter(status);
            setTemplateFilter(null); // Clear template filter when clicking header
        }
        
        // Reset to first page when filter changes
        setCurrentPage(1);
    };

    // Handle status filter click from body (with template filter)
    const handleTemplateStatusFilterClick = (templateName, status, e) => {
        e.stopPropagation(); // Prevent accordion toggle
        
        // Toggle filter - if clicking same combination, clear filters
        if (statusFilter === status && templateFilter === templateName) {
            setStatusFilter(null);
            setTemplateFilter(null);
        } else {
            setStatusFilter(status);
            setTemplateFilter(templateName);
        }
        
        // Reset to first page when filter changes
        setCurrentPage(1);
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
        if (loading) return; // Prevent multiple simultaneous calls
        setLoading(true);
        
        try {
            const requestBody = {
                globalValue: testGlobalValue,
                pageSize,
                lastKey: null, // Reset to first page when sorting
                sortKey: sortCfg.key,
                sortDirection: sortCfg.direction,
                token: JWTValue
            };

            // Include search term if active
            if (searchName && searchName.trim()) {
                requestBody.searchName = searchName.trim();
            }

            const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/listTestsWithStatus_", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();
            if (checkUnauthorized(data)) return;
            const parsedBody = typeof data.body === "string" ? JSON.parse(data.body) : data.body;
            const newItems = parsedBody.items || [];

            setItems(newItems);
            setLastKey(parsedBody.last_key);
            setHasMore(parsedBody.has_more);
            setTotalPages(Math.ceil(parsedBody.total_count / pageSize));
            setCurrentPage(1); // Reset to first page
        } catch (error) {
            //console.error("Error fetching sorted data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Items are already sorted by the server, no client-side sorting needed
    const filteredItems = getFilteredItems();
    const sortedItems = filteredItems;

    // Update total pages based on filtered items count
    const filteredTotalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

    // Pagination logic
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedItems = sortedItems.slice(startIndex, startIndex + pageSize);

    const handleNextPage = async () => {
        const nextPage = currentPage + 1;
        const requiredItems = nextPage * pageSize;

        // Check if we need to fetch more data from server (only when not filtering)
        if (!statusFilter && !templateFilter && requiredItems > items.length && hasMore && !loading) {
            const success = await fetchData(false);
            // Only move to next page after data is fetched
            if (success && nextPage <= filteredTotalPages) {
                setCurrentPage(nextPage);
            }
        } else if (nextPage <= filteredTotalPages) {
            // Data already loaded or filtering, just change page
            setCurrentPage(nextPage);
        }
    };

    const handleCancelRowIndex = () => {
        setConfirmationRowIndex(null);
        setIsDeleteClicked(false);
    }

    const handleOKRowIndex = async (index) => {
        setIsDeleteClicked(false);
        setConfirmationRowIndex(null);
        
        // Store the test to restore if deletion fails
        const testToDelete = items.find(item => item.testID === index);
        
        // Optimistically remove from UI immediately (both items and allItemsForStats)
        setItems((prevItems) => {
            return prevItems.filter((item) => item.testID !== index);
        });
        
        setAllItemsForStats((prevItems) => {
            return prevItems.filter((item) => item.testID !== index);
        });

        // Delete in background
        try {
            const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/deleteTestTransaction", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ testID: index, globalValue: testGlobalValue, token: JWTValue }),
            });

            if (response.status === 200) {
                const data = await response.json();
                if (checkUnauthorized(data)) {
                    // Restore test if unauthorized
                    if (testToDelete) {
                        setItems(prev => [...prev, testToDelete]);
                        setAllItemsForStats(prev => [...prev, testToDelete]);
                    }
                    return;
                }
                showToast("success", "Deleted Successfully", "The test transaction was successfully deleted, and all associated assets are now removed from storage.");
                
                // Refetch stats data to ensure statistics are accurate
                if (searchName && searchName.trim()) {
                    fetchAllItemsForStats(searchName.trim());
                } else {
                    fetchAllItemsForStats();
                }
            } else if (response.status === 404) {
                showToast("error", "Deletion Failed", "Test not found. It may have already been deleted.");
                // Restore test on failure
                if (testToDelete) {
                    setItems(prev => [...prev, testToDelete]);
                    setAllItemsForStats(prev => [...prev, testToDelete]);
                }
            } else if (response.status === 500) {
                showToast("error", "Deletion Failed", "Server error occurred. Please try again.");
                // Restore test on failure
                if (testToDelete) {
                    setItems(prev => [...prev, testToDelete]);
                    setAllItemsForStats(prev => [...prev, testToDelete]);
                }
            } else {
                showToast("error", "Deletion Failed", "Failed to delete the test. Please try again.");
                // Restore test on failure
                if (testToDelete) {
                    setItems(prev => [...prev, testToDelete]);
                    setAllItemsForStats(prev => [...prev, testToDelete]);
                }
            }
        } catch (error) {
            showToast("error", "Error", "An error occurred while deleting the test.");
            // Restore test on error
            if (testToDelete) {
                setItems(prev => [...prev, testToDelete]);
                setAllItemsForStats(prev => [...prev, testToDelete]);
            }
        }
    }

    // Download report function
    const handleDownloadReport = async () => {
        try {
            // Get filtered items for export
            const dataToExport = getFilteredItems();
            
            if (dataToExport.length === 0) {
                showToast('warning', 'No Data', 'No assessments to export.');
                return;
            }

            showToast('info', 'Generating Report', 'Please wait while we prepare your report...');

            // Fetch detailed results for each assessment
            const detailedData = await Promise.all(
                dataToExport.map(async (item) => {
                    try {
                        const searchUUID = item.testID.split('/').pop();
                        const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/checkResult_", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ searchTerm: searchUUID, token: JWTValue }),
                        });

                        const data = await response.json();
                        
                        if (data.statusCode === 200) {
                            const result = JSON.parse(data.body);
                            const correctAnswers = result.correctAnswers || 0;
                            const totalQuestions = result.totalQuestions || 0;
                            
                            // Calculate score as percentage
                            let calculatedScore = 'N/A';
                            if (totalQuestions > 0) {
                                const percentage = (correctAnswers / totalQuestions) * 100;
                                calculatedScore = `${percentage.toFixed(2)}%`;
                            }
                            
                            return {
                                ...item,
                                score: calculatedScore,
                                correctAnswers: correctAnswers,
                                totalQuestions: totalQuestions,
                                submittedAnswers: result.submittedAnswers || 0,
                            };
                        }
                        return item;
                    } catch (error) {
                        return item;
                    }
                })
            );

            // Create CSV content
            const headers = [
                'Date & Time',
                'Candidate Name',
                'Template Name',
                'Test ID',
                'Status',
                'Score (%)',
                'Correct Answers',
                'Total Questions',
                'Submitted Answers',
                'Termination Reason'
            ];

            const csvRows = [
                headers.join(','),
                ...detailedData.map(item => {
                    const date = new Date(item.datetime).toLocaleString();
                    const score = item.score !== undefined ? item.score : 'N/A';
                    const correctAnswers = item.correctAnswers !== undefined ? item.correctAnswers : 'N/A';
                    const totalQuestions = item.totalQuestions !== undefined ? item.totalQuestions : 'N/A';
                    const submittedAnswers = item.submittedAnswers !== undefined ? item.submittedAnswers : 'N/A';
                    const terminationReason = item.terminationReason || (item.status === 'Terminated' ? 'Unknown' : 'N/A');

                    return [
                        `"${date}"`,
                        `"${item.candidateName || 'N/A'}"`,
                        `"${item.templateName || 'N/A'}"`,
                        `"${item.testID || 'N/A'}"`,
                        `"${item.status || 'N/A'}"`,
                        `"${score}"`,
                        `"${correctAnswers}"`,
                        `"${totalQuestions}"`,
                        `"${submittedAnswers}"`,
                        `"${terminationReason}"`
                    ].join(',');
                })
            ];

            const csvContent = csvRows.join('\n');

            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            const filename = `Assessment_Report_${new Date().toISOString().split('T')[0]}_${Date.now()}.csv`;
            
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast('success', 'Report Downloaded', `Successfully exported ${dataToExport.length} assessments.`);
        } catch (error) {
            console.error('Error downloading report:', error);
            showToast('error', 'Download Failed', 'Failed to generate report. Please try again.');
        }
    };

    const handleConfirmationRowIndex = (index) => {
        if (!isDeleteClicked) {
            setConfirmationRowIndex(index);
            setIsDeleteClicked(true);
        }
    }

    // Calculate assessment counts grouped by template name and status (from all items)
    const getAssessmentCounts = () => {
        const counts = {};
        const statusTotals = {
            'Completed': 0,
            'Terminated': 0,
            'Not Started': 0,
            'In Progress': 0
        };
        const templateTotals = {}; // Track total per template
        
        const itemsToCount = allItemsForStats.length > 0 ? allItemsForStats : items;
        
        itemsToCount.forEach(item => {
            const templateName = item.templateName || 'Unknown Template';
            let status = item.status || 'Unknown';
            
            // Normalize status
            if (status === 'Complete') status = 'Completed';
            
            if (!counts[templateName]) {
                counts[templateName] = {
                    total: 0,
                    byStatus: {
                        'Completed': 0,
                        'Terminated': 0,
                        'Not Started': 0,
                        'In Progress': 0
                    }
                };
            }
            
            counts[templateName].total++;
            
            // Only count known statuses
            if (counts[templateName].byStatus.hasOwnProperty(status)) {
                counts[templateName].byStatus[status]++;
            }
            
            // Count status totals
            if (statusTotals.hasOwnProperty(status)) {
                statusTotals[status]++;
            }
            
            // Count template totals
            templateTotals[templateName] = (templateTotals[templateName] || 0) + 1;
        });
        
        return { counts, statusTotals, templateTotals, total: itemsToCount.length };
    };

    const { counts: assessmentCounts, statusTotals, templateTotals, total: totalAssessments } = getAssessmentCounts();

    // Handle template filter click from header (no status filter)
    const handleTemplateFilterClick = (templateName, e) => {
        e.stopPropagation(); // Prevent accordion toggle
        
        // Toggle filter - if clicking same template, clear both filters
        if (templateFilter === templateName && !statusFilter) {
            setTemplateFilter(null);
            setStatusFilter(null);
        } else {
            setTemplateFilter(templateName);
            setStatusFilter(null); // Clear status filter when clicking header template
        }
        
        // Reset to first page when filter changes
        setCurrentPage(1);
    };

    return (
        <div className="results-page">
            
            {/* Compact Assessment Summary - Accordion */}
            {(allItemsForStats.length > 0 || items.length > 0) && (
                <div className="compact-summary">
                    <div 
                        className="compact-summary__header" 
                        onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                        role="button"
                        aria-expanded={isSummaryExpanded}
                        aria-controls="summary-content"
                        tabIndex={0}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setIsSummaryExpanded(!isSummaryExpanded);
                            }
                        }}
                    >
                        <div className="header-row-1">
                            <div className="header-left">
                                <svg 
                                    className={`accordion-icon ${isSummaryExpanded ? 'expanded' : ''}`}
                                    width="16" 
                                    height="16" 
                                    viewBox="0 0 24 24" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="2"
                                >
                                    <polyline points="6 9 12 15 18 9"/>
                                </svg>
                                <h3>Assessment Summary</h3>
                                <button
                                    className="download-report-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadReport();
                                    }}
                                    title="Download detailed report (CSV)"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                        <polyline points="7 10 12 15 17 10"/>
                                        <line x1="12" y1="15" x2="12" y2="3"/>
                                    </svg>
                                    Download Report
                                </button>
                            </div>
                            <div className="header-right">
                                <div className="status-summary">
                                    <span 
                                        className={`status-count status-count--completed ${statusFilter === 'Completed' && !templateFilter ? 'active' : ''}`}
                                        title={`Completed Assessments: ${statusTotals['Completed'] || 0} - Click to filter`}
                                        onClick={(e) => handleStatusFilterClick('Completed', e)}
                                    >
                                        ✓ {statusTotals['Completed'] || 0}
                                    </span>
                                    <span 
                                        className={`status-count status-count--progress ${statusFilter === 'In Progress' && !templateFilter ? 'active' : ''}`}
                                        title={`In Progress Assessments: ${statusTotals['In Progress'] || 0} - Click to filter`}
                                        onClick={(e) => handleStatusFilterClick('In Progress', e)}
                                    >
                                        ⟳ {statusTotals['In Progress'] || 0}
                                    </span>
                                    <span 
                                        className={`status-count status-count--not-started ${statusFilter === 'Not Started' && !templateFilter ? 'active' : ''}`}
                                        title={`Not Started Assessments: ${statusTotals['Not Started'] || 0} - Click to filter`}
                                        onClick={(e) => handleStatusFilterClick('Not Started', e)}
                                    >
                                        ○ {statusTotals['Not Started'] || 0}
                                    </span>
                                    <span 
                                        className={`status-count status-count--terminated ${statusFilter === 'Terminated' && !templateFilter ? 'active' : ''}`}
                                        title={`Terminated Assessments: ${statusTotals['Terminated'] || 0} - Click to filter`}
                                        onClick={(e) => handleStatusFilterClick('Terminated', e)}
                                    >
                                        ✕ {statusTotals['Terminated'] || 0}
                                    </span>
                                </div>
                                <span className="total-badge" title={`Total Assessments: ${totalAssessments}`}>
                                    Total: {totalAssessments}
                                </span>
                            </div>
                        </div>
                        {(statusFilter || templateFilter) && (
                            <div className="header-row-2">
                                {(statusFilter && !templateFilter) && (
                                    <span className="filter-indicator" title={`Filtering by Status: ${statusFilter}`}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                                        </svg>
                                        All Templates → {statusFilter}
                                    </span>
                                )}
                                {(templateFilter && statusFilter) && (
                                    <span className="filter-indicator" title={`Filtering by Template: ${templateFilter}, Status: ${statusFilter}`}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                                        </svg>
                                        {templateFilter} → {statusFilter}
                                    </span>
                                )}
                                {(templateFilter && !statusFilter) && (
                                    <span className="filter-indicator" title={`Filtering by Template: ${templateFilter}`}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                                        </svg>
                                        {templateFilter} → All Statuses
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div 
                        id="summary-content"
                        className={`summary-content ${isSummaryExpanded ? 'expanded' : 'collapsed'}`}
                        aria-hidden={!isSummaryExpanded}
                    >
                        {Object.entries(assessmentCounts).map(([templateName, data]) => (
                            <div key={templateName} className="summary-row">
                                <div 
                                    className={`summary-row__template ${templateFilter === templateName && !statusFilter ? 'active-template' : ''}`}
                                    onClick={(e) => handleTemplateFilterClick(templateName, e)}
                                    title={`Click to filter by ${templateName}`}
                                >
                                    <span className="template-icon">📄</span>
                                    <span className="template-text">{templateName}</span>
                                    <span className="template-count">({data.total})</span>
                                </div>
                                <div className="summary-row__statuses">
                                    <span 
                                        className={`status-chip status-completed ${statusFilter === 'Completed' && templateFilter === templateName ? 'active' : ''}`}
                                        onClick={(e) => handleTemplateStatusFilterClick(templateName, 'Completed', e)}
                                        title={`Click to filter ${templateName} - Completed`}
                                    >
                                        Completed: {data.byStatus['Completed'] || 0}
                                    </span>
                                    <span 
                                        className={`status-chip status-progress ${statusFilter === 'In Progress' && templateFilter === templateName ? 'active' : ''}`}
                                        onClick={(e) => handleTemplateStatusFilterClick(templateName, 'In Progress', e)}
                                        title={`Click to filter ${templateName} - In Progress`}
                                    >
                                        In Progress: {data.byStatus['In Progress'] || 0}
                                    </span>
                                    <span 
                                        className={`status-chip status-not-started ${statusFilter === 'Not Started' && templateFilter === templateName ? 'active' : ''}`}
                                        onClick={(e) => handleTemplateStatusFilterClick(templateName, 'Not Started', e)}
                                        title={`Click to filter ${templateName} - Not Started`}
                                    >
                                        Not Started: {data.byStatus['Not Started'] || 0}
                                    </span>
                                    <span 
                                        className={`status-chip status-terminated ${statusFilter === 'Terminated' && templateFilter === templateName ? 'active' : ''}`}
                                        onClick={(e) => handleTemplateStatusFilterClick(templateName, 'Terminated', e)}
                                        title={`Click to filter ${templateName} - Terminated`}
                                    >
                                        Terminated: {data.byStatus['Terminated'] || 0}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
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
                                    {item.status === "Terminated" && item.terminationReason && (
                                        <p className="result-card__termination-reason">Reason: {item.terminationReason}</p>
                                    )}
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
                {/* Loading Overlay - shows when fetching data with existing items */}
                {loading && items.length > 0 && <LoadingOverlay />}
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
                                            }`}
                                            title={item.status === "Terminated" && item.terminationReason ? `Reason: ${item.terminationReason}` : ""}>
                                            {item.status}
                                            {item.status === "Terminated" && item.terminationReason && (
                                                <span className="termination-reason-hint"> ⓘ</span>
                                            )}
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
