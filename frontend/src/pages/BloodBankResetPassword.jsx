import { useResetBloodBankPasswordMutation, useVerifyBloodBankResetTokenMutation } from "../store/bloodBankApi";
import { ROUTE_PATH } from "../enum/routePath";
import { FaHospital } from "react-icons/fa";
import SharedResetPassword from "../components/SharedResetPassword";
import "../pages.css/SharedAuthForm.css";

const BloodBankResetPassword = () => {
  return (
    <SharedResetPassword
      useVerifyTokenMutation={useVerifyBloodBankResetTokenMutation}
      useResetPasswordMutation={useResetBloodBankPasswordMutation}
      title={
        <>
          <FaHospital style={{ marginRight: "8px" }} /> Reset Blood Bank Password
        </>
      }
      backToLoginPath={ROUTE_PATH.BLOOD_BANK_LOGIN}
      forgotPasswordPath={ROUTE_PATH.BLOOD_BANK_FORGOT_PASSWORD}
      containerClass="blood-bank-reset-password-container"
      boxClass="blood-bank-reset-password-box"
    />
  );
};

export default BloodBankResetPassword;
