const RequestStatusBadge = ({ status }) => {
  const getStatusStyles = (status) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "approved":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "in_progress":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "fulfilled":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
      case "rejected":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "cancelled":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const formatStatus = (status) => {
    return status.replace(/_/g, " ").toUpperCase();
  };

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyles(status)}`}
    >
      {formatStatus(status)}
    </span>
  );
};

export default RequestStatusBadge;
