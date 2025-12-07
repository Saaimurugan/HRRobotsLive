import React, { useState, useEffect } from "react";
import "../TableStyles.css"; // Import the CSS file for styling
import { GlobalProvider, useGlobalContext } from "../globalContext";

const ListTestResultPage = ({ onItemClick }) => {
    const [items, setItems] = useState([]);
    const [currentPage, setCurrentPage] = useState(1); // Start from page 1
    const [lastKey, setLastKey] = useState(null);
    const [totalPages, setTotalPages] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: "datetime", direction: "asc" });
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const {globalValue, setGlobalValue } = useGlobalContext();
    const [searchName, setSearchName] = useState("");
    const [isConfirmationVisible, setIsConfirmationVisible] = useState(false); // State to manage confirmation dialog visibility
    const [isHovered, setIsHovered] = useState(false); // State to manage hover effect
    const [isDeleteClicked, setIsDeleteClicked] = useState(false); // State to manage delete button click
    const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
    const [confirmationRowIndex, setConfirmationRowIndex] = useState(null);

    const pageSize = 10; // Number of items per page
 
    useEffect(() => {
        fetchData(true); // Fetch data when page loads (first call)
    }, []);

    const handleDeleteTest = async (testID) => {
        setLoading(true);
        try {
            const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/deleteTestTransaction", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ testID, globalValue }),
            });
    
            if (response.status === 200) {
                const data = await response.json();
                console.log("Success:", data);
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
    

    const fetchData = async (isFirstLoad = false) => {
        if (!hasMore || loading) return; // Prevent unnecessary fetch calls

        setLoading(true); // Indicate fetching state

/*         const url = new URL("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/listTestsWithStatus");
        url.searchParams.append("page_size", pageSize);
        if (lastKey && !isFirstLoad) {
            url.searchParams.append("last_key", lastKey);
        }
        url.searchParams.append("email",  globalValue); */

        try {
            const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/listTestsWithStatus", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ globalValue, pageSize, lastKey, searchName }),
              });
            
            const data = await response.json();

            // Ensure body is properly parsed
            const parsedBody = typeof data.body === "string" ? JSON.parse(data.body) : data.body;

            const newItems = parsedBody.items || []; // Ensure items exist
            if (newItems.length === 0 && !isFirstLoad) return; // Don't update if no new data

            setItems(prevItems => isFirstLoad ? newItems : [...prevItems, ...newItems]); // Append new data
            setLastKey(parsedBody.last_key);
            setHasMore(parsedBody.has_more);
            setTotalPages(Math.ceil(parsedBody.total_count / pageSize));

            // Update page number only if fetching new data
            if (!isFirstLoad) {
                setCurrentPage(prev => prev + 1);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false); // Reset loading state
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
                body: JSON.stringify({ globalValue, pageSize, lastKey, searchName }),
              });
            
            const data = await response.json();

            // Ensure body is properly parsed
            const parsedBody = typeof data.body === "string" ? JSON.parse(data.body) : data.body;

            const newItems = parsedBody.items || []; // Ensure items exist
            if (newItems.length === 0) return; // Don't update if no new data

            setItems(newItems); // Append new data
            setLastKey(parsedBody.last_key);
            setHasMore(parsedBody.has_more);
            setTotalPages(Math.ceil(parsedBody.total_count / pageSize));

            // Update page number only if fetching new data
            setCurrentPage(1);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false); // Reset loading state
        }
    };

    // Sorting function
    const handleSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const sortedItems = [...items].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
    });

    // Pagination logic
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedItems = sortedItems.slice(startIndex, startIndex + pageSize);

    const handleNextPage = () => {
        // console.log(paginatedItems.length, pageSize, hasMore);
        if (paginatedItems.length <= pageSize && hasMore) {
            fetchData(false); // Fetch new data if needed
        } else {
            setCurrentPage(prev => Math.min(prev + 1, totalPages)); // Move to the next page
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
        //Remove the idem from the list
        setItems((prevItems) => prevItems.filter((item) => item.testID !== index));
    }

    const handleConfirmationRowIndex = (index) => {
        if (!isDeleteClicked) {
            setConfirmationRowIndex(index);
            setIsDeleteClicked(true);
        }
    }

    return (
        <div className="p-6">
            <div className="table-container">
            <div style={{ width: "30%", display: "flex", padding:"10px", justifyContent:"right" }}>
                    <input
                        type="text"
                        placeholder="Search using Candidate Name"
                        value={searchName}
                        style={{ width: "30%" }}
                        onChange={(e) => setSearchName(e.target.value)}
                    />
                    <button onClick={fetchSearchData} disabled={loading}>
                        {loading?"loading...":"Search"}
                    </button>
                </div>
                <table className="table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort("datetime")}>
                                Date & Time {sortConfig.key === "datetime" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                            </th>
                            <th onClick={() => handleSort("candidateName")}>
                                Candidate Name {sortConfig.key === "candidateName" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
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
                            <th>
                                Remove Test
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedItems.length > 0 ? (
                            paginatedItems.map((item, index) => (
                                <tr key={index}
                                onClick={() => onItemClick(item.testID)} // Call the callback with the testID
                                onMouseEnter={() => {!isDeleteClicked && setHoveredRowIndex(index)}}
                                onMouseLeave={() => {!isDeleteClicked && setHoveredRowIndex(null)}}
                                >
                                    <td>{item.datetime}</td>
                                    <td>{item.candidateName}</td>
                                    <td>{item.templateName}</td>
                                    <td>{item.testID}</td>
                                    <td className={item.status === "Completed" ? "status-completed" : "status-not-started"}>
                                        {item.status}
                                    </td>
                                    
                                    <td style={{padding: hoveredRowIndex === index ? "5px" : "12px" }}>
                                    <div  className="buttons" style={{display: hoveredRowIndex === index ? "block" : "none" }}>
                                    {confirmationRowIndex !== index ? 
                                    <button style={{backgroundColor:"lightblue"}} onClick={(e) => { e.stopPropagation(); handleConfirmationRowIndex(index); }}>
                                        <svg fill="#000000" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5.755,20.283,4,8H20L18.245,20.283A2,2,0,0,1,16.265,22H7.735A2,2,0,0,1,5.755,20.283ZM21,4H16V3a1,1,0,0,0-1-1H9A1,1,0,0,0,8,3V4H3A1,1,0,0,0,3,6H21a1,1,0,0,0,0-2Z"/></svg>
                                    </button>
                                    : 
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); handleCancelRowIndex(); }}>
                                            <svg fill="#000000" width="16" height="16" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1599.04 1523.627 396.373 320.96C546.88 188.053 743.787 106.667 960 106.667c470.507 0 853.333 382.826 853.333 853.333 0 216.107-81.386 413.12-214.293 563.627M106.667 960c0-216.213 81.28-413.12 214.293-563.627L1523.627 1599.04c-150.507 132.907-347.52 214.293-563.627 214.293-470.507 0-853.333-382.826-853.333-853.333M960 0C429.76 0 0 429.76 0 960s429.76 960 960 960c530.133 0 960-429.76 960-960S1490.133 0 960 0" fill-rule="evenodd"/>
                                            </svg>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleOKRowIndex(item.testID); }}>
                                            <svg width="16" height="16" viewBox="0 -20 130 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M34.7162 81.5027C36.3213 79.9761 37.2031 79.2039 38.0103 78.3599C63.8892 51.3046 92.2309 26.9469 120.74 2.77407C121.817 1.86111 122.921 0.696462 124.196 0.3701C125.733 -0.0238104 128.241 -0.282655 128.928 0.552804C129.852 1.67765 130.015 4.12286 129.452 5.60109C128.782 7.35947 127.15 8.86542 125.669 10.1822C116.833 18.0391 107.749 25.6258 99.0678 33.6462C80.9213 50.4165 62.8904 67.3116 44.9751 84.3312C37.125 91.7736 34.1038 92.075 26.8803 84.1228C22.1253 78.8861 7.77509 61.237 3.38035 55.6767C2.75974 54.8123 2.20692 53.9011 1.72689 52.9513C0.732118 51.1915 0.0876263 49.254 2.05727 47.8895C4.25215 46.3708 5.81043 47.9557 7.11073 49.606C8.42738 51.2769 9.55004 53.1127 10.9598 54.6962C15.336 59.6122 29.9896 76.32 34.7162 81.5027Z" fill="#000000"/>
                                            </svg>
                                        </button>
                                    </>
                                    }
                                    </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="text-center py-4">No data available</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="pagination">
                <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                    disabled={currentPage === 1}
                >
                    Previous
                </button>
                
                <span>Page {currentPage} of {totalPages}</span>
                
                <button 
                    onClick={handleNextPage} 
                    disabled={!hasMore && currentPage >= totalPages}
                >
                    {loading ? "Loading..." : "Next"}
                </button>
            </div>
        </div>
    );
};

export default ListTestResultPage;
