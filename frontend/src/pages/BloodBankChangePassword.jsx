import { useChangeBloodBankPasswordMutation } from "../store/bloodBankApi";
import { FaHospital } from "react-icons/fa";
import SharedChangePassword from "../components/SharedChangePassword";
import "../pages.css/SharedAuthForm.css";

const BloodBankChangePassword = () => {
  return (
    <SharedChangePassword
      useChangePasswordMutation={useChangeBloodBankPasswordMutation}
      title={
        <>
          <FaHospital style={{ marginRight: "8px" }} /> Change Password
        </>
      }
      formDescription="Update your blood bank password to keep your account secure"
      containerClass="blood-bank-change-password-container"
      boxClass="blood-bank-change-password-box"
    />
  );
};

export default BloodBankChangePassword;
