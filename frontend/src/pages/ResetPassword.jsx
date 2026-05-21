import { useResetPasswordMutation, useVerifyResetTokenMutation } from "../store/userApi";
import { ROUTE_PATH } from "../enum/routePath";
import SharedResetPassword from "../components/SharedResetPassword";
import "../pages.css/SharedAuthForm.css";

const ResetPassword = () => {
  return (
    <SharedResetPassword
      useVerifyTokenMutation={useVerifyResetTokenMutation}
      useResetPasswordMutation={useResetPasswordMutation}
      title="Reset Password"
      backToLoginPath={ROUTE_PATH.LOGIN}
      forgotPasswordPath={ROUTE_PATH.FORGOT_PASSWORD}
      containerClass="reset-password-container"
      boxClass="reset-password-box"
    />
  );
};

export default ResetPassword;
