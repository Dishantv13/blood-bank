import { useForgotPasswordMutation } from "../store/userApi";
import { ROUTE_PATH } from "../enum/routePath";
import SharedForgotPassword from "../components/SharedForgotPassword";
import "../pages.css/SharedAuthForm.css";

const ForgotPassword = () => {
  return (
    <SharedForgotPassword
      useForgotPasswordMutation={useForgotPasswordMutation}
      title="Forgot Password"
      placeholder="Enter your email"
      backToLoginPath={ROUTE_PATH.LOGIN}
      containerClass="forgot-password-container"
      boxClass="forgot-password-box"
    />
  );
};

export default ForgotPassword;
