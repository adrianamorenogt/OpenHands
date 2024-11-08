import React from "react";
import { useTranslation } from "react-i18next";
import { Input, Radio, RadioGroup } from "@nextui-org/react";
import hotToast from "react-hot-toast";
import { I18nKey } from "#/i18n/declaration";
import BaseModal from "../base-modal/BaseModal";
import toast from "#/utils/toast";
import { getToken } from "#/services/auth";
import { removeApiKey, removeUnwantedKeys } from "#/utils/utils";
import { useSocket } from "#/context/socket";
import OpenHands from "#/api/open-hands";
import { Feedback } from "#/api/open-hands.types";

const isEmailValid = (email: string) => {
  // Regular expression to validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const VIEWER_PAGE = "https://www.all-hands.dev/share";
const FEEDBACK_VERSION = "1.0";

interface FeedbackModalProps {
  polarity: "positive" | "negative";
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSendFeedback: () => void;
}

function FeedbackModal({
  polarity,
  isOpen,
  onOpenChange,
  onSendFeedback,
}: FeedbackModalProps) {
  const { events } = useSocket();
  const { t } = useTranslation();

  const [email, setEmail] = React.useState("");
  const [permissions, setPermissions] = React.useState<"public" | "private">(
    "private",
  );

  React.useEffect(() => {
    // check if email is stored in local storage
    const storedEmail = localStorage.getItem("feedback-email");
    if (storedEmail) setEmail(storedEmail);
  }, []);

  const handleEmailChange = (newEmail: string) => {
    setEmail(newEmail);
  };

  const copiedToClipboardToast = () => {
    hotToast(t(I18nKey.FEEDBACK$PASSWORD_COPIED_MESSAGE), {
      icon: "📋",
      position: "bottom-right",
    });
  };

  const onPressToast = (password: string) => {
    navigator.clipboard.writeText(password);
    copiedToClipboardToast();
  };

  const shareFeedbackToast = (
    message: string,
    link: string,
    password: string,
  ) => {
    hotToast(
      <div className="flex flex-col gap-1">
        <span>{message}</span>
        <a
          data-testid="toast-share-url"
          className="text-blue-500 underline"
          onClick={() => onPressToast(password)}
          href={link}
          target="_blank"
          rel="noreferrer"
        >
          {t(I18nKey.FEEDBACK$GO_TO_FEEDBACK)}
        </a>
        <span onClick={() => onPressToast(password)} className="cursor-pointer">
          {t(I18nKey.FEEDBACK$PASSWORD)} {password}
          <span className="text-gray-500">
            ({t(I18nKey.FEEDBACK$COPY_LABEL)})
          </span>
        </span>
      </div>,
      { duration: 5000 },
    );
  };

  const handleSendFeedback = async () => {
    onSendFeedback();
    const feedback: Feedback = {
      version: FEEDBACK_VERSION,
      feedback: polarity,
      email,
      permissions,
      token: getToken(),
      trajectory: removeApiKey(removeUnwantedKeys(events)),
    };

    try {
      localStorage.setItem("feedback-email", email); // store email in local storage
      // TODO: Move to data loader
      const token = localStorage.getItem("token");
      if (token) {
        const response = await OpenHands.sendFeedback(token, feedback);
        if (response.statusCode === 200) {
          const { message, feedback_id: feedbackId, password } = response.body;
          const link = `${VIEWER_PAGE}?share_id=${feedbackId}`;
          shareFeedbackToast(message, link, password);
        } else {
          toast.error(
            "share-error",
            `${t(I18nKey.FEEDBACK$FAILED_TO_SHARE)} ${response.body.message}`,
          );
        }
      }
    } catch (error) {
      toast.error(
        "share-error",
        `${t(I18nKey.FEEDBACK$FAILED_TO_SHARE)} ${error}`,
      );
    }
  };

  return (
    <BaseModal
      testID="feedback-modal"
      isOpen={isOpen}
      title={t(I18nKey.FEEDBACK$MODAL_TITLE)}
      onOpenChange={onOpenChange}
      isDismissable={false} // prevent unnecessary messages from being stored (issue #1285)
      actions={[
        {
          label: t(I18nKey.FEEDBACK$SHARE_LABEL),
          className: "bg-primary rounded-lg",
          action: handleSendFeedback,
          isDisabled: !isEmailValid(email),
          closeAfterAction: true,
        },
        {
          label: t(I18nKey.FEEDBACK$CANCEL_LABEL),
          className: "bg-neutral-500 rounded-lg",
          action() {},
          closeAfterAction: true,
        },
      ]}
    >
      <p>{t(I18nKey.FEEDBACK$MODAL_CONTENT)}</p>

      <Input
        label={t(I18nKey.FEEDBACK$EMAIL_LABEL)}
        aria-label="email"
        data-testid="email-input"
        placeholder={t(I18nKey.FEEDBACK$EMAIL_PLACEHOLDER)}
        type="text"
        value={email}
        onChange={(e) => {
          handleEmailChange(e.target.value);
        }}
      />
      {!isEmailValid(email) && (
        <p data-testid="invalid-email-message" className="text-red-500">
          {t(I18nKey.FEEDBACK$INVALID_EMAIL_FORMAT)}
        </p>
      )}
      <RadioGroup
        data-testid="permissions-group"
        label={t(I18nKey.FEEDBACK$SHARING_SETTINGS_LABEL)}
        orientation="horizontal"
        value={permissions}
        onValueChange={(value) => setPermissions(value as "public" | "private")}
      >
        <Radio value="private">{t(I18nKey.FEEDBACK$PRIVATE_LABEL)}</Radio>
        <Radio value="public">{t(I18nKey.FEEDBACK$PUBLIC_LABEL)}</Radio>
      </RadioGroup>
    </BaseModal>
  );
}

export default FeedbackModal;
