import { useForgotBloodBankPasswordMutation } from "../store/bloodBankApi";
import { ROUTE_PATH } from "../enum/routePath";
import { FaHospital } from "react-icons/fa";
import SharedForgotPassword from "../components/SharedForgotPassword";
import "../pages.css/SharedAuthForm.css";

const BloodBankForgotPassword = () => {
  return (
    <SharedForgotPassword
      useForgotPasswordMutation={useForgotBloodBankPasswordMutation}
      title={
        <>
          <FaHospital style={{ marginRight: "8px" }} /> Blood Bank - Forgot Password
        </>
      }
      placeholder="Enter your blood bank email"
      backToLoginPath={ROUTE_PATH.BLOOD_BANK_LOGIN}
      containerClass="blood-bank-forgot-password-container"
      boxClass="blood-bank-forgot-password-box"
    />
  );
};

export default BloodBankForgotPassword;
