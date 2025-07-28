import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './firebaseConfig';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, query, orderBy } from 'firebase/firestore';

// --- Global Helper Functions and Constants ---
const USD_TO_INR_RATE = 83.5; // Mock exchange rate

const calculateFuelCost = (fuelEfficiency, distance) => {
  if (!fuelEfficiency || !distance) return 'N/A';
  const distanceKm = parseFloat(distance.replace(' km', ''));
  if (isNaN(distanceKm)) return 'N/A';

  const costUSD = (distanceKm / fuelEfficiency) * 0.5; // Original mock calculation in USD
  const costINR = costUSD * USD_TO_INR_RATE;
  return `₹${costINR.toFixed(2)}`; // Return in INR
};

const getRiskColor = (risk) => {
  if (typeof risk !== 'string') return 'text-gray-600'; // Handle undefined or null input gracefully
  switch (risk.toLowerCase()) {
    case 'low': return 'text-green-600';
    case 'medium': return 'text-yellow-600';
    case 'high': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

const getStatusColor = (status) => {
  switch (status.toLowerCase()) {
    case 'scheduled': return 'bg-blue-100 text-blue-800';
    case 'in progress': return 'bg-yellow-100 text-yellow-800';
    case 'completed': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// List of major Indian cities for dropdowns
const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune",
  "Ahmedabad", "Jaipur", "Lucknow", "Nagpur", "Indore", "Surat", "Patna",
  "Bhopal", "Chandigarh", "Guwahati", "Kochi", "Visakhapatnam", "Coimbatore"
].sort(); // Sort alphabetically for better UX

/**
 * Calculates a score for a driver based on performance, hours worked, and proximity.
 * @param {number} performanceRating - Driver's performance rating (1-5).
 * @param {number} hoursWorked - Hours driver has worked today (e.g., 0-9).
 * @param {number} proximityScore - Proximity score (0-100), higher is better.
 * @returns {number} driverScore (0-100)
 */
const calculateDriverScore = (performanceRating, hoursWorked, proximityScore) => {
  // Normalize performanceRating to 0-1 and give it 40% weight
  const performanceComponent = (performanceRating / 5) * 40;

  // Normalize hoursWorked (assuming 9 hours is max ideal, so 0 hours is best, 9 hours is worst for this component)
  // (1 - hoursWorked / 9) ensures that less hours worked results in a higher score for this component.
  // Clamp hoursWorked to max 9 to prevent negative scores if hoursWorked > 9.
  const clampedHoursWorked = Math.min(hoursWorked, 9);
  const hoursComponent = (1 - clampedHoursWorked / 9) * 30;

  // Normalize proximityScore to 0-1 and give it 30% weight
  const proximityComponent = (proximityScore / 100) * 30;

  let driverScore = performanceComponent + hoursComponent + proximityComponent;

  // Ensure score is within 0-100 range
  driverScore = Math.max(0, Math.min(100, driverScore));

  return parseFloat(driverScore.toFixed(2)); // Round to 2 decimal places
};

/**
 * Calculates a score for a vehicle based on fuel efficiency, utilization, and maintenance status.
 * @param {number} fuelEfficiency - Vehicle's fuel efficiency (e.g., km/L).
 * @param {number} utilizationScore - Vehicle's utilization score (0-100).
 * @param {string} maintenanceStatus - Vehicle's maintenance status ('Good', 'Needs Check', 'Poor').
 * @returns {number} vehicleScore (0-100)
 */
const calculateVehicleScore = (fuelEfficiency, utilizationScore, maintenanceStatus) => {
  let maintenancePenalty = 0;
  if (maintenanceStatus === 'Poor') {
    maintenancePenalty = 30;
  } else if (maintenanceStatus === 'Needs Check') {
    maintenancePenalty = 15;
  }

  // Formula: fuelEfficiency * 5 + utilizationScore - maintenancePenalty
  // Assuming fuelEfficiency is a reasonable number (e.g., 5-20 km/L)
  // This formula might need tuning based on actual data ranges for fuelEfficiency
  let vehicleScore = (fuelEfficiency * 5) + utilizationScore - maintenancePenalty;

  // Ensure score is within 0-100 range
  vehicleScore = Math.max(0, Math.min(100, vehicleScore));

  return parseFloat(vehicleScore.toFixed(2)); // Round to 2 decimal places
};


// --- Firebase Context ---
const FirebaseContext = createContext(null);

const FirebaseProvider = ({ children }) => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

useEffect(() => {
  try {
    // Use the imported firebaseConfig directly
    if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
      console.error("Firebase config is missing. Please ensure 'firebaseConfig' is provided.");
      return;
    }

    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const firebaseAuth = getAuth(app);

    setDb(firestore);
    setAuth(firebaseAuth);

    const signIn = async () => {
      try {
        await signInAnonymously(firebaseAuth);
        console.log("Signed in anonymously.");
      } catch (error) {
        console.error("Firebase authentication error:", error);
      }
    };

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (user) {
        setUserId(user.uid);
        console.log("User ID:", user.uid);
      } else {
        setUserId(null);
        console.log("No user signed in.");
        signIn();
      }
      setIsAuthReady(true);
    });

    signIn();
    return () => unsubscribe();
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
}, []);

  return (
    <FirebaseContext.Provider value={{ db, auth, userId, isAuthReady }}>
      {children}
    </FirebaseContext.Provider>
  );
};

const useFirebase = () => {
  return useContext(FirebaseContext);
};

// --- Toast Message Component ---
const ToastMessage = ({ message, type, onClose }) => {
  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const textColor = 'text-white';

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Auto-close after 3 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-4 ${bgColor} ${textColor}`}
      role="alert"
    >
      <span className="font-semibold">{message}</span>
      <button
        onClick={onClose}
        className="ml-4 bg-white text-gray-800 rounded-full px-2 py-1 text-xs font-bold hover:bg-gray-200 transition duration-200"
      >
        ×
      </button>
    </div>
  );
};

// --- Tooltip Component ---
const Tooltip = ({ text, children }) => {
  return (
    <span className="relative inline-block group"> {/* Changed div to span */}
      {children}
      {/* Changed inner div to span to avoid nesting div in p */}
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block px-3 py-2 text-sm text-white bg-gray-700 rounded-md shadow-lg z-50 whitespace-nowrap">
        {text}
        <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-700"></span>
      </span>
    </span>
  );
};


// --- Driver Suggestions Component ---
const DriverSuggestions = ({ drivers, recommendedDriverId, onConfirmDriver }) => {
  const [selectedDriverId, setSelectedDriverId] = useState(recommendedDriverId);

  const anyDriverOverworked = drivers.some(driver => driver.hoursWorked > 8);

  const renderStars = (rating) => {
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-5 h-5 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 1.118l-2.8-2.034c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.927 8.73c-.783-.57-.381-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z"></path>
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold text-blue-600 mb-4 text-center">Suggested Drivers</h3>

      {anyDriverOverworked && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-6" role="alert">
          <strong className="font-bold">Warning!</strong>
          <span className="block sm:inline ml-2">One or more suggested drivers are currently overworked.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers.map((driver) => (
          <div
            key={driver.id}
            className={`p-4 rounded-lg shadow-md border-2 cursor-pointer
              ${selectedDriverId === driver.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
              ${driver.hoursWorked > 8 ? 'bg-red-50 border-red-300' : ''}
            `}
            onClick={() => setSelectedDriverId(driver.id)}
          >
            <div className="flex justify-between items-center mb-2">
              <p className="font-bold text-lg text-gray-800">{driver.name}</p>
              {recommendedDriverId === driver.id && (
                <span className="bg-green-200 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  Recommended
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">Location: {driver.location}</p>
            <p className="text-sm text-gray-600">Hours worked today: <span className={driver.hoursWorked > 8 ? 'text-red-600 font-semibold' : ''}>{driver.hoursWorked}h</span></p>
            <p className="text-sm text-gray-600">Score: <span className="font-semibold">{driver.driverScore}</span></p>
            <div className="flex items-center text-sm text-gray-600">
              Performance: {renderStars(driver.performanceRating)}
            </div>
            {selectedDriverId !== driver.id && (
              <button
                className="mt-3 w-full bg-gray-200 text-gray-800 text-sm font-semibold py-2 rounded-md hover:bg-gray-300 transition duration-200"
                onClick={(e) => { e.stopPropagation(); setSelectedDriverId(driver.id); }}
              >
                Override
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => onConfirmDriver(selectedDriverId)}
        disabled={!selectedDriverId}
        className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Confirm Driver
      </button>
    </div>
  );
};

// VehicleSuggestions Component (outside DriverSuggestions)

const VehicleSuggestions = ({ vehicles, recommendedVehicleId, onConfirmVehicle, routeDistance }) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState(recommendedVehicleId);

  const getOverallMatchDescription = (score) => {
    if (score >= 90) return "🟢 Excellent Match";
    if (score >= 70) return "🟡 Good Match";
    if (score >= 50) return "🟠 Fair Match";
    return "🔴 Poor Match";
  };

  return (
<div className="mt-8">
  <h3 className="text-xl font-semibold text-blue-600 mb-4 text-center">Suggested Vehicles</h3>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {vehicles.map((vehicle) => (
      <div
        key={vehicle.id}
        className={`p-4 rounded-lg shadow-md border-2 cursor-pointer
          ${selectedVehicleId === vehicle.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
        `}
        onClick={() => setSelectedVehicleId(vehicle.id)}
      >
        <div className="flex justify-between items-center mb-2">
          <p className="font-bold text-lg text-gray-800">🚚 {vehicle.type}</p>
          {recommendedVehicleId === vehicle.id && (
            <span className="bg-green-200 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Recommended
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">Capacity: {vehicle.capacity}</p>
        <p className="text-sm text-gray-600">Fuel Efficiency: {vehicle.fuelEfficiency} km/L</p>
        <p className="text-sm text-gray-600">Maintenance: {vehicle.maintenanceStatus}</p>
        <p className="text-sm text-gray-600">
          ⛽ Est. Fuel Cost: <span className="font-semibold">{calculateFuelCost(vehicle.fuelEfficiency, routeDistance)}</span>
        </p>
        <p className="text-sm text-gray-600 flex items-center">
          📊 Utilization Score: {vehicle.utilizationScore}%
          <Tooltip text="How efficiently this vehicle’s capacity is being used for the selected load.">
            <span className="ml-1 text-gray-500 cursor-help">ℹ️</span>
          </Tooltip>
        </p>
        <p className="text-sm text-gray-600 flex items-center">
          🧠 Overall Match Score: {vehicle.vehicleScore} {getOverallMatchDescription(vehicle.vehicleScore)}
          <Tooltip text="A composite score based on fuel efficiency, maintenance status, and load utilization.">
            <span className="ml-1 text-gray-500 cursor-help">ℹ️</span>
          </Tooltip>
        </p>
        {selectedVehicleId !== vehicle.id && (
          <button
            className="mt-3 w-full bg-gray-200 text-gray-800 text-sm font-semibold py-2 rounded-md hover:bg-gray-300 transition duration-200"
            onClick={(e) => { e.stopPropagation(); setSelectedVehicleId(vehicle.id); }}
          >
            Override
          </button>
        )}
      </div>
    ))}
  </div>

  <button
    onClick={() => onConfirmVehicle(selectedVehicleId)}
    disabled={!selectedVehicleId}
    className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Confirm Vehicle
  </button>
</div>
  );
};
// --- Trip Summary Dashboard Component ---
const TripSummaryDashboard = ({ tripDetails, onEditRoute, onEditDriver, onEditVehicle, onDispatchNow, role }) => {
  const { route, driver, vehicle } = tripDetails;

  const isEditable = role === 'dispatcher' || role === 'admin';

  return (
    <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-blue-700 mb-6 text-center">Trip Summary</h2>

      {/* Trip Details Section */}
      <div className="mb-6 border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Route Details</h3>
          {isEditable && (
            <button
              onClick={onEditRoute}
              className="bg-blue-100 text-blue-700 text-sm font-semibold py-1 px-3 rounded-md hover:bg-blue-200 transition duration-200"
            >
              Edit
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700">
          <p><span className="font-medium">Origin:</span> {route.origin}</p>
          <p><span className="font-medium">Destination:</span> {route.destination}</p>
          <p><span className="font-medium">Delivery Time:</span> {route.deliveryTimeSlot ? new Date(route.deliveryTimeSlot).toLocaleString() : 'N/A'}</p>
          <p><span className="font-medium">Distance:</span> {route.distance}</p>
          <p><span className="font-medium">ETA:</span> {route.eta}</p>
          <p><span className="font-medium">Route Cost:</span> {route.cost}</p>
          <p><span className="font-medium">Risk Level:</span> <span className={`${getRiskColor(route?.riskRating)} font-bold`}>{route?.riskRating}</span></p> {/* Added optional chaining */}
        </div>
      </div>

      {/* Assigned Driver Section */}
      <div className="mb-6 border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Assigned Driver</h3>
          {isEditable && (
            <button
              onClick={onEditDriver}
              className="bg-blue-100 text-blue-700 text-sm font-semibold py-1 px-3 rounded-md hover:bg-blue-200 transition duration-200"
            >
              Edit
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700">
          <p><span className="font-medium">Name:</span> {driver.name}</p>
          <p><span className="font-medium">Location:</span> {driver.location}</p>
          <p><span className="font-medium">Hours Worked Today:</span> {driver.hoursWorked}h</p>
          <p><span className="font-medium">Performance Rating:</span> {driver.performanceRating} Stars</p>
          <p><span className="font-medium">Score:</span> {driver.driverScore}</p>
        </div>
      </div>

      {/* Assigned Vehicle Section */}
      <div className="mb-6 border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Assigned Vehicle</h3>
          {isEditable && (
            <button
              onClick={onEditVehicle}
              className="bg-blue-100 text-blue-700 text-sm font-semibold py-1 px-3 rounded-md hover:bg-blue-200 transition duration-200"
            >
              Edit
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700">
          <p><span className="font-medium">Type:</span> {vehicle.type}</p>
          <p><span className="font-medium">Capacity:</span> {vehicle.capacity}</p>
          <p><span className="font-medium">Fuel Efficiency:</span> {vehicle.fuelEfficiency} km/L</p>
          <p><span className="font-medium">Maintenance Status:</span> {vehicle.maintenanceStatus}</p>
          <p><span className="font-medium">Est. Fuel Cost:</span> {calculateFuelCost(vehicle.fuelEfficiency, route.distance)}</p>
          <p><span className="font-medium">Utilization Score:</span> {vehicle.utilizationScore}%</p>
          <p><span className="font-medium">Score:</span> {vehicle.vehicleScore}</p>
        </div>
      </div>

      {/* Final Dispatch Button */}
      {isEditable && (
        <button
          onClick={onDispatchNow}
          className="w-full bg-green-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 transition duration-200 ease-in-out mt-6"
        >
          Dispatch Now
        </button>
      )}
    </div>
  );
};

// --- Trip Suggestions Component ---
const TripSuggestions = ({ suggestions, onConfirmTrip, onBackToForm }) => {
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0); // Moved to top-level of function

  if (!suggestions) {
    return null; // Don't render if no suggestions
  }

  const { optimalRoute, alternateRoutes, drivers, recommendedDriverId, vehicles, recommendedVehicleId } = suggestions;

  const handleConfirmDriver = (driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    setSelectedDriver(driver);
    console.log('Driver Confirmed:', driver);
  };

  const handleConfirmVehicle = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    setSelectedVehicle(vehicle);
    console.log('Vehicle Confirmed:', vehicle);
  };

  const handleFinalConfirmTrip = () => {
  const selectedRoute = [optimalRoute, ...alternateRoutes][selectedRouteIndex];
  onConfirmTrip({
    route: { ...selectedRoute, deliveryTimeSlot: suggestions.deliveryTimeSlot },
    driver: selectedDriver,
    vehicle: selectedVehicle,
    actualDeliveryTime: new Date(Date.now() + Math.random() * 8 * 3600 * 1000).toISOString(),
    deliveryStatus: Math.random() > 0.7 ? 'delayed' : 'on-time',
  });
};

  return (
    <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-blue-700 mb-6 text-center">Trip Suggestions</h2>

      {/* Optimal Route Section */}
      <div className="mb-8 border border-blue-200 rounded-lg p-4">
        <h3 className="text-xl font-semibold text-blue-600 mb-4">Optimal Route</h3>
        <div className="relative w-full h-64 bg-gray-200 rounded-lg overflow-hidden mb-4">
          <img
            src={`https://placehold.co/600x400/ADD8E6/000?text=Map+from+${optimalRoute.origin}+to+${optimalRoute.destination}`}
            alt="Mock Map View"
            className="w-full h-full object-cover"
            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x400/ADD8E6/000?text=Map+Unavailable'; }}
          />
          <div className="absolute top-2 left-2 bg-white bg-opacity-80 p-2 rounded-md text-sm shadow">
            <p className="font-semibold">Optimal Route</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-700">
          <div>
            <p className="font-medium">ETA:</p>
            <p className="font-bold text-lg">{optimalRoute.eta}</p>
          </div>
          <div>
            <p className="font-medium">Distance:</p>
            <p className="font-bold text-lg">{optimalRoute.distance}</p>
          </div>
          <div>
            <p className="font-medium">Risk Rating:</p>
            <p className={`font-bold text-lg ${getRiskColor(optimalRoute?.riskRating)}`}>{optimalRoute?.riskRating}</p> {/* Added optional chaining */}
          </div>
        </div>
        <div className="mt-4 text-gray-700">
          <p className="font-medium">Cost:</p>
          <p className="font-bold text-lg">{optimalRoute.cost}</p>
        </div>
      </div>

      {/* Alternate Routes Section */}
      {alternateRoutes && alternateRoutes.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-blue-600 mb-4">Alternate Route Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[optimalRoute, ...alternateRoutes].map((route, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 cursor-pointer transition
                  ${selectedRouteIndex === index ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 bg-gray-50'}
                `}
                onClick={() => setSelectedRouteIndex(index)}
              >
                <p className="font-semibold text-gray-800 mb-2">
                  {index === 0 ? 'Recommended Route' : `Option ${index}: ${route.name || ''}`}
                </p>
                <div className="text-sm text-gray-600">
                  <p>ETA: <span className="font-medium">{route.eta}</span></p>
                  <p>Distance: <span className="font-medium">{route.distance}</span></p>
                  <p>Cost: <span className="font-medium">{route.cost}</span></p>
                </div>
                {selectedRouteIndex === index && (
                  <span className="mt-2 inline-block bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                    Selected
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Driver Suggestions Section */}
      {!selectedDriver ? (
        <DriverSuggestions
          drivers={drivers}
          recommendedDriverId={recommendedDriverId}
          onConfirmDriver={handleConfirmDriver}
        />
      ) : (
        <div className="mt-8 p-4 rounded-lg shadow-md border-2 border-blue-500 bg-blue-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-semibold text-blue-600">Selected Driver</h3>
            <button
              onClick={() => setSelectedDriver(null)}
              className="bg-blue-100 text-blue-700 text-sm font-semibold py-1 px-3 rounded-md hover:bg-blue-200 transition duration-200"
            >
              Change
            </button>
          </div>
          <p className="font-bold text-lg text-gray-800">{selectedDriver.name}</p>
          <p className="text-sm text-gray-600">Location: {selectedDriver.location}</p>
          <p className="text-sm text-gray-600">Hours worked today: {selectedDriver.hoursWorked}h</p>
          <p className="text-sm text-gray-600">Performance: {selectedDriver.performanceRating} Stars</p>
          <p className="text-sm text-gray-600">Score: <span className="font-semibold">{selectedDriver.driverScore}</span></p>
        </div>
      )}

      {/* Vehicle Suggestions Section */}
      {selectedDriver && !selectedVehicle ? (
        <VehicleSuggestions
          vehicles={vehicles}
          recommendedVehicleId={recommendedVehicleId}
          onConfirmVehicle={handleConfirmVehicle}
          routeDistance={optimalRoute.distance}
        />
      ) : selectedDriver && selectedVehicle ? (
        <div className="mt-8 p-4 rounded-lg shadow-md border-2 border-blue-500 bg-blue-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-semibold text-blue-600">Selected Vehicle</h3>
            <button
              onClick={() => setSelectedVehicle(null)}
              className="bg-blue-100 text-blue-700 text-sm font-semibold py-1 px-3 rounded-md hover:bg-blue-200 transition duration-200"
            >
              Change
            </button>
          </div>
          <p className="font-bold text-lg text-gray-800">{selectedVehicle.type}</p>
          <p className="text-sm text-gray-600">Capacity: {selectedVehicle.capacity}</p>
          <p className="text-sm text-gray-600">Fuel Efficiency: {selectedVehicle.fuelEfficiency} km/L</p>
          <p className="text-sm text-gray-600">Maintenance: {selectedVehicle.maintenanceStatus}</p>
          <p className="text-sm text-gray-600">
            Est. Fuel Cost: <span className="font-semibold">{calculateFuelCost(selectedVehicle.fuelEfficiency, optimalRoute.distance)}</span>
          </p>
          <p className="text-sm text-gray-600">Utilization Score: {selectedVehicle.utilizationScore}%</p>
          <p className="text-sm text-gray-600">Score: <span className="font-semibold">{selectedVehicle.vehicleScore}</span></p>
        </div>
      ) : null}


      <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
        <button
          onClick={handleFinalConfirmTrip}
          disabled={!selectedDriver || !selectedVehicle}
          className="flex-1 bg-green-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirm Trip
        </button>
        <button
          onClick={onBackToForm}
          className="flex-1 bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-200 ease-in-out"
        >
          Back to Form
        </button>
      </div>
    </div>
  );
};

// --- Trip Planning Flow Component (renamed from TripPlanningForm) ---
const TripPlanningFlow = ({ initialTripDetails, onConfirmTrip, onGoToOverview, onBackToForm, role }) => {
  const { db, userId, isAuthReady } = useFirebase();
  const [origin, setOrigin] = useState(initialTripDetails?.route?.origin || '');
  const [destination, setDestination] = useState(initialTripDetails?.route?.destination || '');
  const [loadWeight, setLoadWeight] = useState(initialTripDetails?.loadWeight || '');
  const [loadVolume, setLoadVolume] = useState(initialTripDetails?.loadVolume || '');
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState(initialTripDetails?.route?.deliveryTimeSlot || '');
  const [routePreference, setRoutePreference] = useState(initialTripDetails?.route?.routePreference || 'fastest');
  const [suggestions, setSuggestions] = useState(null);
  const [confirmedTrip, setConfirmedTrip] = useState(initialTripDetails || null);
  const [currentPhase, setCurrentPhase] = useState(initialTripDetails ? 'summary' : 'form'); // Start at summary if initial details provided

  // Determine if the current user role can edit/create trips
  const canEditTrips = role === 'dispatcher' || role === 'admin';

  // Effect to update form fields if initialTripDetails changes (e.g., when viewing from overview)
  useEffect(() => {
    if (initialTripDetails) {
      setOrigin(initialTripDetails.route?.origin || '');
      setDestination(initialTripDetails.route?.destination || '');
      setLoadWeight(initialTripDetails.loadWeight || '');
      setLoadVolume(initialTripDetails.loadVolume || '');
      setDeliveryTimeSlot(initialTripDetails.route?.deliveryTimeSlot || '');
      setRoutePreference(initialTripDetails.route?.routePreference || 'fastest');
      setConfirmedTrip(initialTripDetails);
      setCurrentPhase('summary');
    } else {
      // Reset form if no initial details
      setOrigin('');
      setDestination('');
      setLoadWeight('');
      setLoadVolume('');
      setDeliveryTimeSlot('');
      setRoutePreference('fastest');
      setSuggestions(null);
      setConfirmedTrip(null);
      setCurrentPhase('form');
    }
  }, [initialTripDetails]);


  const saveTripToFirestore = async (tripData) => {
    if (!db || !userId) {
      console.error("Firestore DB or User ID not available.");
      return;
    }
    try {
      // Use the global appId variable
      const tripsCollectionRef = collection(db, `artifacts/${firebaseConfig.appId}/users/${userId}/trips`);

      // If it's an existing trip being updated (e.g., from editing), use its ID
      if (tripData.id) {
        const tripDocRef = doc(db, `artifacts/${firebaseConfig.appId}/users/${userId}/trips`, tripData.id);
        await updateDoc(tripDocRef, {
          ...tripData,
          updatedAt: new Date().toISOString(),
        });
        console.log("Trip updated in Firestore successfully!");
      } else {
        // Otherwise, add a new document
        await setDoc(doc(tripsCollectionRef), {
          ...tripData,
          status: 'Scheduled',
          createdAt: new Date().toISOString(),
        });
        console.log("New trip saved to Firestore successfully!");
      }
    } catch (error) {
      console.error("Error saving/updating trip to Firestore:", error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canEditTrips) {
      onGoToOverview('You do not have permission to plan trips.', 'error');
      return;
    }

    const tripData = {
      origin,
      destination,
      loadWeight: parseFloat(loadWeight),
      loadVolume: parseFloat(loadVolume),
      deliveryTimeSlot,
      routePreference,
    };
    console.log('Trip Data Submitted:', tripData);

    const mockDrivers = [
      { id: 'driver1', name: 'Alice Smith', location: 'Downtown', hoursWorked: 6, performanceRating: 5, proximityScore: 80 },
      { id: 'driver2', name: 'Bob Johnson', location: 'Northside', hoursWorked: 9, performanceRating: 4, proximityScore: 50 },
      { id: 'driver3', name: 'Charlie Brown', location: 'Southside', hoursWorked: 4, performanceRating: 3, proximityScore: 90 },
    ];

    const mockVehicles = [
      { id: 'vehicle1', type: 'Van', capacity: '1000 kg / 8 m³', fuelEfficiency: 12, maintenanceStatus: 'Good', utilizationScore: 75 },
      { id: 'vehicle2', type: 'Truck (Small)', capacity: '3000 kg / 20 m³', fuelEfficiency: 8, maintenanceStatus: 'Needs Check', utilizationScore: 50 },
      { id: 'vehicle3', type: 'Truck (Large)', capacity: '10000 kg / 60 m³', fuelEfficiency: 5, maintenanceStatus: 'Poor', utilizationScore: 90 },
    ];

    // Calculate scores for mock data
    const scoredDrivers = mockDrivers.map(driver => ({
      ...driver,
      driverScore: calculateDriverScore(driver.performanceRating, driver.hoursWorked, driver.proximityScore)
    })).sort((a, b) => b.driverScore - a.driverScore); // Sort by score, highest first

    const scoredVehicles = mockVehicles.map(vehicle => ({
      ...vehicle,
      vehicleScore: calculateVehicleScore(vehicle.fuelEfficiency, vehicle.utilizationScore, vehicle.maintenanceStatus)
    })).sort((a, b) => b.vehicleScore - a.vehicleScore); // Sort by score, highest first

    const mockSuggestions = {
      origin: tripData.origin,
      destination: tripData.destination,
      deliveryTimeSlot: tripData.deliveryTimeSlot,
      optimalRoute: {
        origin: tripData.origin,
        destination: tripData.destination,
        eta: '4h 30m',
        distance: '350 km',
        cost: '$120.00', // Still mock USD cost here, converted at display
        riskRating: 'Low',
      },
      alternateRoutes: [
        { name: 'Scenic Route', eta: '5h 15m', distance: '380 km', cost: '$110.00' },
        { name: 'Highway Bypass', eta: '4h 45m', distance: '360 km', cost: '$135.00' },
      ],
      drivers: scoredDrivers, // Use scored and sorted drivers
      recommendedDriverId: scoredDrivers[0]?.id, // Recommended is now the highest scoring
      vehicles: scoredVehicles, // Use scored and sorted vehicles
      recommendedVehicleId: scoredVehicles[0]?.id, // Recommended is now the highest scoring
    };
    setSuggestions(mockSuggestions);
    setCurrentPhase('suggestions');
  };

  const handleConfirmTrip = (details) => {
    console.log('Final Trip Confirmed:', details);
    setConfirmedTrip(details);
    setCurrentPhase('summary');
  };

  const handleBackToFormInternal = () => { // Renamed to avoid conflict with prop
    setSuggestions(null);
    setConfirmedTrip(null);
    setCurrentPhase('form');
  };

  const handleDispatchNow = () => {
    if (confirmedTrip) {
      saveTripToFirestore(confirmedTrip);
      console.log('Dispatching trip:', confirmedTrip);
      onGoToOverview('Trip Dispatched successfully!', 'success');
      setSuggestions(null);
      setConfirmedTrip(null);
      setOrigin('');
      setDestination('');
      setLoadWeight('');
      setLoadVolume('');
      setDeliveryTimeSlot('');
      setRoutePreference('fastest');
    }
  };

  if (!canEditTrips && currentPhase !== 'summary') { // If not editable and not viewing summary, show message
    return (
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-2xl mx-auto mt-8 text-center text-gray-700">
        <h2 className="text-2xl font-bold text-red-700 mb-4">Access Denied</h2>
        <p>You do not have permission to plan or edit trips.</p>
        <p className="mt-2">Please switch to a 'Dispatcher' or 'Admin' role to access this functionality.</p>
      </div>
    );
  }


  return (
    <>
      {currentPhase === 'form' && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md w-full max-w-2xl mx-auto mt-8">
          <h2 className="text-2xl font-bold text-blue-700 mb-6 text-center">Plan a New Trip</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="origin" className="block text-sm font-medium text-gray-700 mb-1">
                Origin
                <span className="tooltip ml-1 text-gray-500 cursor-help" title="Select the origin city for the dispatch.">?</span>
              </label>
              <select
                id="origin"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                required
              >
                <option value="">Select Origin City</option>
                {INDIAN_CITIES.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
                Destination
                <span className="tooltip ml-1 text-gray-500 cursor-help" title="Select the destination city for the dispatch.">?</span>
              </label>
              <select
                id="destination"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
              >
                <option value="">Select Destination City</option>
                {INDIAN_CITIES.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="loadWeight" className="block text-sm font-medium text-gray-700 mb-1">Load Weight (kg)</label>
              <input
                type="number"
                id="loadWeight"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={loadWeight}
                onChange={(e) => setLoadWeight(e.target.value)}
                placeholder="e.g., 500"
                min="0"
                required
              />
            </div>
            <div>
              <label htmlFor="loadVolume" className="block text-sm font-medium text-gray-700 mb-1">Load Volume (m³)</label>
              <input
                type="number"
                id="loadVolume"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={loadVolume}
                onChange={(e) => setLoadVolume(e.target.value)}
                placeholder="e.g., 10"
                min="0"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="deliveryTimeSlot" className="block text-sm font-medium text-gray-700 mb-1">Delivery Time Slot</label>
            <input
              type="datetime-local"
              id="deliveryTimeSlot"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={deliveryTimeSlot}
              onChange={(e) => setDeliveryTimeSlot(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="routePreference" className="block text-sm font-medium text-gray-700 mb-1">Route Preference</label>
            <select
              id="routePreference"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={routePreference}
              onChange={(e) => setRoutePreference(e.target.value)}
            >
              <option value="fastest">Fastest</option>
              <option value="cheapest">Cheapest</option>
              <option value="avoid-tolls">Avoid Tolls</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out"
          >
            Plan Trip
          </button>
        </form>
      )}

      {currentPhase === 'suggestions' && suggestions && (
        <TripSuggestions
          suggestions={suggestions}
          onConfirmTrip={handleConfirmTrip}
          onBackToForm={handleBackToFormInternal} // Use internal handler
        />
      )}

      {currentPhase === 'summary' && confirmedTrip && (
        <TripSummaryDashboard
          tripDetails={confirmedTrip}
          onEditRoute={() => setCurrentPhase('suggestions')}
          onEditDriver={() => setCurrentPhase('suggestions')}
          onEditVehicle={() => setCurrentPhase('suggestions')}
          onDispatchNow={handleDispatchNow}
          role={role} // Pass role to summary dashboard
        />
      )}
    </>
  );
};

// --- Trips Overview Component ---
const TripsOverview = ({ onViewTripDetails, onShowToast, role }) => {
  const { db, userId, isAuthReady } = useFirebase();
  const [trips, setTrips] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'scheduled', 'in progress', 'completed', 'cancelled'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Determine if the current user role can modify trips
  const canModifyTrips = role === 'dispatcher' || role === 'admin';
  const canViewAnalytics = role === 'admin';

  useEffect(() => {
  if (!isAuthReady || !db || !userId) {
    if (isAuthReady) {
      console.warn("Firestore not ready or user not authenticated for TripsOverview.");
      setLoading(false); // ← Add this line
    }
    return;
  }

    // Use the global appId variable
    const tripsCollectionRef = collection(db, `artifacts/${firebaseConfig.appId}/users/${userId}/trips`);
    const q = query(tripsCollectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const fetchedTrips = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTrips(fetchedTrips);
        setLoading(false);
        setError(null);
      }
      catch (err) {
        console.error("Error fetching trips:", err);
        setError("Failed to load trips. Please try again.");
        setLoading(false);
      }
    }, (err) => {
      console.error("Firestore snapshot error:", err);
      setError("Failed to subscribe to trip updates. Check console for details.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, userId, isAuthReady]);

  const filteredTrips = trips.filter(trip => {
    if (filter === 'all') return true;
    return trip.status.toLowerCase() === filter;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const updateTripStatus = async (tripId, newStatus) => {
    if (!db || !userId || !canModifyTrips) {
      onShowToast(`You do not have permission to change trip status to '${newStatus}'.`, 'error');
      return;
    }
    const confirmAction = window.confirm(`Are you sure you want to change this trip's status to '${newStatus}'?`);
    if (confirmAction) {
      try {
        const tripDocRef = doc(db, `artifacts/${firebaseConfig.appId}/users/${userId}/trips`, tripId);
        await updateDoc(tripDocRef, { status: newStatus });
        onShowToast(`Trip status updated to '${newStatus}' successfully!`, 'success');
        console.log(`Trip ${tripId} status updated to ${newStatus}.`);
      } catch (error) {
        onShowToast(`Failed to update trip status to '${newStatus}'.`, 'error');
        console.error(`Error updating trip status to ${newStatus}:`, error);
      }
    }
  };

  const handleCancelTrip = (tripId) => updateTripStatus(tripId, 'Cancelled');
  const handleMarkInProgress = (tripId) => updateTripStatus(tripId, 'In Progress');
  const handleMarkCompleted = (tripId) => updateTripStatus(tripId, 'Completed');


  const handleSendReminder = (trip) => {
    if (!canModifyTrips) {
      onShowToast('You do not have permission to send reminders.', 'error');
      return;
    }
    onShowToast(`Reminder sent to ${trip.driver?.name || 'driver'} for trip ${trip.id.substring(0, 6)}!`, 'success');
    console.log(`SMS/WhatsApp reminder sent for trip ${trip.id} to driver ${trip.driver?.name}`);
  };

  const calculateDeliveryMetrics = () => {
    let onTime = 0;
    let delayed = 0;
    let completed = 0;

    trips.forEach(trip => {
      if (trip.status.toLowerCase() === 'completed') {
        completed++;
        if (trip.deliveryStatus === 'on-time') {
          onTime++;
        } else if (trip.deliveryStatus === 'delayed') {
          delayed++;
        }
      }
    });
    return { onTime, delayed, completed };
  };

  const { onTime, delayed, completed } = calculateDeliveryMetrics();
  const scheduledTripsCount = trips.filter(t => t.status.toLowerCase() === 'scheduled').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] bg-white rounded-xl shadow-md w-full max-w-4xl mx-auto mt-8 p-6">
        <div className="text-lg font-semibold text-gray-700">Loading trips...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative w-full max-w-4xl mx-auto mt-8" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline ml-2">{error}</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-blue-700 mb-6 text-center">Trips Overview</h2>

      {canViewAnalytics && (
        <div className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Delivery Metrics (Admin View)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-blue-100 rounded-md">
              <p className="text-3xl font-bold text-blue-700">{scheduledTripsCount}</p>
              <p className="text-sm text-blue-600">Scheduled Trips</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-md">
              <p className="text-3xl font-bold text-purple-700">{completed}</p>
              <p className="text-sm text-purple-600">Trips Completed</p>
            </div>
            <div className="p-3 bg-green-100 rounded-md">
              <p className="text-3xl font-bold text-green-700">{onTime}</p>
              <p className="text-sm text-green-600">On-Time Deliveries</p>
            </div>
            <div className="p-3 bg-red-100 rounded-md">
              <p className="text-3xl font-bold text-red-700">{delayed}</p>
              <p className="text-sm text-red-600">Delayed Deliveries</p>
            </div>
          </div>
          <div className="mt-4 text-center text-gray-600">
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {['all', 'scheduled', 'in progress', 'completed', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`py-2 px-4 rounded-lg text-sm font-semibold transition duration-200 ease-in-out
              ${filter === status ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
            `}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {filteredTrips.length === 0 ? (
        <div className="text-center text-gray-600 py-10">
          No {filter === 'all' ? '' : filter} trips found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">ID</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Route</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Driver</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Vehicle</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">ETA</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Risk</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map((trip) => (
                <tr key={trip.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-800">{trip.id.substring(0, 6)}...</td>
                  <td className="py-3 px-4 text-sm text-gray-800">{trip.route.origin} to {trip.route.destination}</td>
                  <td className="py-3 px-4 text-sm text-gray-800">{trip.driver?.name || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm text-gray-800">{trip.vehicle?.type || 'N/A'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(trip.status)}`}>
                      {trip.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-800">{trip.route.eta}</td>
                  <td className="py-3 px-4 text-sm text-gray-800">
                    <span className={`${getRiskColor(trip.route?.riskRating)} font-semibold`}> {/* Added optional chaining */}
                      {trip.route.riskRating}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm flex flex-wrap gap-1">
                    {trip.status.toLowerCase() === 'scheduled' && canModifyTrips && (
                      <>
                        <button
                          onClick={() => handleMarkInProgress(trip.id)}
                          className="bg-purple-500 text-white text-xs font-semibold py-1 px-2 rounded-md hover:bg-purple-600 transition duration-200"
                        >
                          In Progress
                        </button>
                        <button
                          onClick={() => handleCancelTrip(trip.id)}
                          className="bg-red-500 text-white text-xs font-semibold py-1 px-2 rounded-md hover:bg-red-600 transition duration-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSendReminder(trip)}
                          className="bg-yellow-500 text-white text-xs font-semibold py-1 px-2 rounded-md hover:bg-yellow-600 transition duration-200"
                        >
                          Remind
                        </button>
                      </>
                    )}
                    {trip.status.toLowerCase() === 'in progress' && canModifyTrips && (
                      <>
                        <button
                          onClick={() => handleMarkCompleted(trip.id)}
                          className="bg-green-500 text-white text-xs font-semibold py-1 px-2 rounded-md hover:bg-green-600 transition duration-200"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => handleCancelTrip(trip.id)}
                          className="bg-red-500 text-white text-xs font-semibold py-1 px-2 rounded-md hover:bg-red-600 transition duration-200"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => onViewTripDetails(trip)}
                      className="bg-blue-500 text-white text-xs font-semibold py-1 px-2 rounded-md hover:bg-blue-600 transition duration-200"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


// --- Settings Panel Component ---
const SettingsPanel = ({ initialSettings, onSaveSettings, onShowToast }) => {
  const [defaultRoutePreference, setDefaultRoutePreference] = useState(initialSettings.defaultRoutePreference);
  const [maxDrivingHours, setMaxDrivingHours] = useState(initialSettings.maxDrivingHours);
  const [fuelPricesByState, setFuelPricesByState] = useState(initialSettings.fuelPricesByState);
  const [enableAIRecommendations, setEnableAIRecommendations] = useState(initialSettings.enableAIRecommendations);

  const handleAddFuelPrice = () => {
    setFuelPricesByState([...fuelPricesByState, { id: Date.now(), state: '', price: '' }]);
  };

  const handleUpdateFuelPrice = (id, field, value) => {
    setFuelPricesByState(fuelPricesByState.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleRemoveFuelPrice = (id) => {
    setFuelPricesByState(fuelPricesByState.filter(item => item.id !== id));
  };

  const handleSave = () => {
    // Basic validation
    if (maxDrivingHours < 0) {
      onShowToast('Max Driving Hours cannot be negative.', 'error');
      return;
    }
    const invalidFuelPrices = fuelPricesByState.some(item => !item.state || isNaN(parseFloat(item.price)) || parseFloat(item.price) <= 0);
    if (invalidFuelPrices) {
      onShowToast('Please ensure all fuel prices have a state and a valid positive price.', 'error');
      return;
    }

    const newSettings = {
      defaultRoutePreference,
      maxDrivingHours: parseFloat(maxDrivingHours),
      fuelPricesByState: fuelPricesByState.map(item => ({
        ...item,
        price: parseFloat(item.price)
      })),
      enableAIRecommendations,
    };
    onSaveSettings(newSettings);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-blue-700 mb-6 text-center">Logistics Settings (Admin)</h2>

      {/* General Preferences */}
      <div className="mb-8 border border-gray-200 rounded-lg p-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">General Preferences</h3>
        <div className="mb-4">
          <label htmlFor="defaultRoutePreference" className="block text-sm font-medium text-gray-700 mb-1">
            Default Route Preference
            <span className="tooltip ml-2 text-gray-500 cursor-help" title="Sets the default route optimization for new trips.">?</span>
          </label>
          <select
            id="defaultRoutePreference"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={defaultRoutePreference}
            onChange={(e) => setDefaultRoutePreference(e.target.value)}
          >
            <option value="fastest">Fastest</option>
            <option value="cheapest">Cheapest</option>
            <option value="avoid-tolls">Avoid Tolls</option>
          </select>
        </div>
        <div className="mb-4">
          <label htmlFor="maxDrivingHours" className="block text-sm font-medium text-gray-700 mb-1">
            Max Driving Hours Before Fatigue Warning
            <span className="tooltip ml-2 text-gray-500 cursor-help" title="Maximum hours a driver can be on duty before the system issues a fatigue warning.">?</span>
          </label>
          <input
            type="number"
            id="maxDrivingHours"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={maxDrivingHours}
            onChange={(e) => setMaxDrivingHours(e.target.value)}
            min="0"
            required
          />
        </div>
      </div>

      {/* Fuel Prices */}
      <div className="mb-8 border border-gray-200 rounded-lg p-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          Fuel Price by State (₹/Litre)
          <span className="tooltip ml-2 text-gray-500 cursor-help" title="Configure fuel prices per litre for different states to ensure accurate cost calculations.">?</span>
        </h3>
        <div className="space-y-3 mb-4">
          {fuelPricesByState.map(item => (
            <div key={item.id} className="flex gap-2 items-center">
              <select
                className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={item.state}
                onChange={(e) => handleUpdateFuelPrice(item.id, 'state', e.target.value)}
              >
                <option value="">Select State/City</option>
                {INDIAN_CITIES.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <input
                type="number"
                className="w-24 p-2 border border-gray-300 rounded-md"
                placeholder="Price"
                value={item.price}
                onChange={(e) => handleUpdateFuelPrice(item.id, 'price', e.target.value)}
                min="0"
                step="0.01"
              />
              <button
                onClick={() => handleRemoveFuelPrice(item.id)}
                className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={handleAddFuelPrice}
          className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-600 transition duration-200"
        >
          Add Fuel Price
        </button>
      </div>

      {/* AI Recommendations */}
      <div className="mb-8 border border-gray-200 rounded-lg p-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">AI Recommendations</h3>
        <div className="flex items-center justify-between">
          <label htmlFor="enableAIRecommendations" className="text-sm font-medium text-gray-700">
            Enable AI Recommendations
            <span className="tooltip ml-2 text-gray-500 cursor-help" title="Toggle AI-driven suggestions for routes, drivers, and vehicles.">?</span>
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="enableAIRecommendations"
              className="sr-only peer"
              checked={enableAIRecommendations}
              onChange={(e) => setEnableAIRecommendations(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-green-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200 ease-in-out"
      >
        Save Settings
      </button>
    </div>
  );
};


// --- Main App Components ---

const Dashboard = () => {
  const { userId, isAuthReady } = useFirebase();
  const [currentView, setCurrentView] = useState('planning'); // 'planning', 'overview', or 'settings'
  const [tripToView, setTripToView] = useState(null); // Used to view a specific trip from overview
  const [toast, setToast] = useState(null); // { message: '', type: 'success' | 'error' }
  const [role, setRole] = useState('dispatcher'); // Default role

  // Mock settings state (will be saved to Firestore in a real app)
  const [appSettings, setAppSettings] = useState({
    defaultRoutePreference: 'fastest',
    maxDrivingHours: 10,
    fuelPricesByState: [{ id: 1, state: 'Delhi', price: 96.72 }],
    enableAIRecommendations: true,
  });

  const handleGoToOverview = (message = null, type = null) => {
    setCurrentView('overview');
    setTripToView(null); // Clear any trip being viewed
    if (message) {
      setToast({ message, type });
    }
  };

  const handleViewTripDetails = (trip) => {
    setTripToView(trip);
    setCurrentView('planning'); // Switch to planning view, but show summary
  };

  const handleConfirmTripFromPlanning = (details) => {
    setTripToView(details); // Set the confirmed trip details
    setCurrentView('planning'); // Stay in planning view, but show summary
  };

  const handleBackToFormFromSummary = () => {
    setTripToView(null); // Clear trip to view
    setCurrentView('planning'); // Go back to the form phase
  };

  // Function to save settings (mock for now)
  const handleSaveSettings = (settings) => {
    setAppSettings(settings);
    setToast({ message: 'Settings saved successfully!', type: 'success' });
    console.log('Settings saved:', settings);
    setCurrentView('overview'); // Optionally navigate after saving
  };


  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-lg font-semibold text-gray-700">Loading authentication...</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-gray-50 min-h-screen flex flex-col items-center">
      <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 w-full max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-800 mb-6 text-center">
          Logistics Dispatch Dashboard
        </h1>
        {userId ? (
          <div className="text-center text-gray-700 text-lg">
            <p className="mb-2">Welcome to your dispatch planning app!</p>
            <p className="font-mono text-sm break-all">Your User ID: <span className="font-bold text-blue-600">{userId}</span></p>
            <p className="mt-4 text-gray-600">
              Manage your trips below.
            </p>
          </div>
        ) : (
          <div className="text-center text-red-500 text-lg">
            <p>Authentication failed or still in progress. Please refresh if this persists.</p>
          </div>
        )}
      </div>

      {userId && (
        <>
          {/* Role Selector */}
          <div className="mt-6 mb-4 w-full max-w-xs flex items-center justify-center gap-2">
            <label htmlFor="role-select" className="text-gray-700 font-medium">Select Role:</label>
            <select
              id="role-select"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setCurrentView('planning'); // Reset view when role changes
                setTripToView(null); // Clear any viewed trip
              }}
              className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="dispatcher">Dispatcher</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          <div className="flex justify-center mb-6 gap-4 mt-6">
            <button
              onClick={() => {
                setCurrentView('planning');
                setTripToView(null); // Ensure fresh form when planning new trip
              }}
              className={`py-2 px-4 rounded-lg font-semibold transition duration-200 ease-in-out
                ${currentView === 'planning' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
              `}
            >
              Plan New Trip
            </button>
            <button
              onClick={() => handleGoToOverview()}
              className={`py-2 px-4 rounded-lg font-semibold transition duration-200 ease-in-out
                ${currentView === 'overview' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
              `}
            >
              Trips Overview
            </button>
            {role === 'admin' && (
              <button
                onClick={() => setCurrentView('settings')}
                className={`py-2 px-4 rounded-lg font-semibold transition duration-200 ease-in-out
                  ${currentView === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
                `}
              >
                Settings
              </button>
            )}
          </div>

          {currentView === 'planning' ? (
            <TripPlanningFlow
              initialTripDetails={tripToView} // Pass trip to view if coming from overview
              onConfirmTrip={handleConfirmTripFromPlanning}
              onGoToOverview={handleGoToOverview}
              onBackToForm={handleBackToFormFromSummary} // This will be used by TripSummaryDashboard
              role={role} // Pass role to TripPlanningFlow
            />
          ) : currentView === 'overview' ? (
            <TripsOverview
              onViewTripDetails={handleViewTripDetails}
              onShowToast={setToast} // Pass toast setter to overview
              role={role} // Pass role to TripsOverview
            />
          ) : currentView === 'settings' && role === 'admin' ? (
            <SettingsPanel
              initialSettings={appSettings}
              onSaveSettings={handleSaveSettings}
              onShowToast={setToast}
            />
          ) : ( // Fallback for unauthorized access to settings
            <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-2xl mx-auto mt-8 text-center text-gray-700">
              <h2 className="text-2xl font-bold text-red-700 mb-4">Access Denied</h2>
              <p>You do not have permission to view settings.</p>
            </div>
          )}
        </>
      )}
      {toast && <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

// Main App component
const App = () => {
  return (
    <FirebaseProvider>
      <div className="font-sans antialiased">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
        <style>
          {`
            body {
              font-family: 'Inter', sans-serif;
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            .tooltip {
              position: relative;
              display: inline-block;
            }
            .tooltip .tooltiptext {
              visibility: hidden;
              width: 200px;
              background-color: #333;
              color: #fff;
              text-align: center;
              border-radius: 6px;
              padding: 5px 0;
              position: absolute;
              z-index: 1;
              bottom: 125%; /* Position above the text */
              left: 50%;
              margin-left: -100px;
              opacity: 0;
              transition: opacity 0.3s;
            }
            .tooltip .tooltiptext::after {
              content: "";
              position: absolute;
              top: 100%;
              left: 50%;
              margin-left: -5px;
              border-width: 5px;
              border-style: solid;
              border-color: #333 transparent transparent transparent;
            }
            .tooltip:hover .tooltiptext {
              visibility: visible;
              opacity: 1;
            }
          `}
        </style>
        <Dashboard />
      </div>
    </FirebaseProvider>
  );
};

export default App;
