import { useGetAllRequestsQuery } from "../store/requestApi";
import RequestStatusBadge from "./RequestStatusBadge";
import { FiMapPin, FiDroplet, FiArrowRight } from "react-icons/fi";
import { Link } from "react-router-dom";

const MatchingRequests = ({ userBloodGroup }) => {
  const { data: response, isLoading } = useGetAllRequestsQuery({
    status: "pending",
  });

  const COMPATIBILITY_MAP = {
    "A+": ["A+", "A-", "O+", "O-"],
    "A-": ["A-", "O-"],
    "B+": ["B+", "B-", "O+", "O-"],
    "B-": ["B-", "O-"],
    "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "AB-": ["AB-", "A-", "B-", "O-"],
    "O+": ["O+", "O-"],
    "O-": ["O-"],
  };

  const isCompatible = (targetGroup) => {
    return COMPATIBILITY_MAP[targetGroup]?.includes(userBloodGroup);
  };

  const matchingRequests =
    response?.data?.filter((req) => isCompatible(req.bloodGroup)) || [];

  if (isLoading)
    return <div className="p-4 animate-pulse bg-gray-50 rounded-lg h-32"></div>;
  if (!userBloodGroup || matchingRequests.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
      <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-rose-50/30">
        <div>
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <FiDroplet className="w-5 h-5 text-rose-500" />
            Matching Blood Requests
          </h3>
          <p className="text-xs text-rose-600 font-medium">
            Be a lifesaver today. You are a match for these requests!
          </p>
        </div>
        <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md text-xs font-bold">
          {matchingRequests.length} MATCHES
        </span>
      </div>

      <div className="divide-y divide-gray-50">
        {matchingRequests.slice(0, 3).map((request) => (
          <div
            key={request._id}
            className="p-5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center font-bold text-rose-700 text-sm">
                  {request.bloodGroup}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 leading-none mb-1">
                    {request.patientName}
                  </h4>
                  <div className="flex items-center gap-1 text-gray-500 text-xs text-gray-500">
                    <FiMapPin className="w-3 h-3" />
                    {request.hospital?.name || "Local Hospital"}
                  </div>
                </div>
              </div>
              <RequestStatusBadge status={request.status} />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-gray-500">
                Required:{" "}
                <span className="font-bold text-gray-700">
                  {request.units} Units
                </span>
              </div>
              <Link
                to={`/requests/${request._id}`}
                className="flex items-center gap-1 text-rose-600 font-bold text-xs uppercase tracking-wider group-hover:translate-x-1 transition-transform"
              >
                I CAN HELP <FiArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {matchingRequests.length > 3 && (
        <Link
          to="/dashboard"
          className="block p-3 text-center text-xs font-bold text-gray-500 hover:text-rose-600 bg-gray-50 transition-colors"
        >
          VIEW ALL MATCHES
        </Link>
      )}
    </div>
  );
};

export default MatchingRequests;
