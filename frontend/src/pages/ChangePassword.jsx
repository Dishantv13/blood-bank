import { useChangeUserPasswordMutation } from "../store/userApi";
import SharedChangePassword from "../components/SharedChangePassword";
import "../pages.css/SharedAuthForm.css";

const ChangePassword = () => {
  return (
    <SharedChangePassword
      useChangePasswordMutation={useChangeUserPasswordMutation}
      title="Change Password"
      formDescription="Update your password to keep your account secure"
      containerClass="change-password-container"
      boxClass="change-password-box"
    />
  );
};

export default ChangePassword;
