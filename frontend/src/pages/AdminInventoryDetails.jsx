import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTE_PATH } from "../enum/routePath";
import { useGetInventoryByIdQuery } from "../store/adminApi.js";
import AdminBackButton from "../components/AdminBackButton.jsx";
import "../pages.css/AdminInventory.css";

const AdminInventoryDetails = () => {
  const navigate = useNavigate();
  const { inventoryId } = useParams();

  const {
    data: response,
    isLoading,
    isError,
  } = useGetInventoryByIdQuery(inventoryId, {
    skip: !inventoryId,
  });

  const details = response?.data;

  return (
    <>
      <div className="dashboard-header-premium">
        <h1 className="page-title">Inventory Details</h1>
        <p className="page-subtitle">View complete blood-group inventory for the selected blood bank</p>
      </div>

      <button
        className="btn-premium"
        style={{ marginBottom: "1.5rem" }}
        onClick={() => navigate(ROUTE_PATH.ADMIN_INVENTORY)}
      >
        Back to Inventory
      </button>

      {isLoading && (
        <div className="loading-message">Loading inventory details...</div>
      )}

      {!isLoading && isError && (
        <div className="inventory-detail-empty">
          Unable to load inventory details for this blood bank.
        </div>
      )}

      {!isLoading && !isError && details && (
        <div className="inventory-detail-card">
          <div className="inventory-detail-header">
            <h2>{details.bloodBank}</h2>
            <p>
              Total units: <strong>{details.totalUnits}</strong>
            </p>
          </div>

          <div className="inventory-detail-table-wrap">
            <table className="inventory-detail-table">
              <thead>
                <tr>
                  <th>Blood Type</th>
                  <th>Units</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {details.inventory?.map((item) => (
                  <tr key={`${details._id}-${item.bloodType}`}>
                    <td>{item.bloodType}</td>
                    <td>{item.quantity}</td>
                    <td>
                      {item.lastUpdated
                        ? new Date(item.lastUpdated).toLocaleDateString()
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminInventoryDetails;
