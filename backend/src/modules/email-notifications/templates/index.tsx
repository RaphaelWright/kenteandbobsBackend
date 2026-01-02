import { ReactNode } from 'react'
import { MedusaError } from '@medusajs/framework/utils'
import { InviteUserEmail, INVITE_USER, isInviteUserData } from './invite-user'
import { OrderPlacedTemplate, ORDER_PLACED, isOrderPlacedTemplateData } from './order-placed'
import { PasswordResetEmail, PASSWORD_RESET, isPasswordResetTemplateData } from './password-reset'
import { PasswordResetConfirmationEmail, PASSWORD_RESET_CONFIRMATION, isPasswordResetConfirmationTemplateData } from './password-reset-confirmation'
import { VendorOrderNotificationTemplate, VENDOR_ORDER_NOTIFICATION, isVendorOrderNotificationData } from './vendor-order-notification'

export const EmailTemplates = {
  INVITE_USER,
  ORDER_PLACED,
  PASSWORD_RESET,
  PASSWORD_RESET_CONFIRMATION,
  VENDOR_ORDER_NOTIFICATION,
} as const

export type EmailTemplateType = keyof typeof EmailTemplates

export function generateEmailTemplate(templateKey: string, data: unknown): ReactNode {
  switch (templateKey) {
    case EmailTemplates.INVITE_USER:
      if (!isInviteUserData(data)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid data for template "${EmailTemplates.INVITE_USER}"`
        )
      }
      return <InviteUserEmail {...data} />

    case EmailTemplates.ORDER_PLACED:
      if (!isOrderPlacedTemplateData(data)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid data for template "${EmailTemplates.ORDER_PLACED}"`
        )
      }
      return <OrderPlacedTemplate {...data} />

    case EmailTemplates.PASSWORD_RESET:
      if (!isPasswordResetTemplateData(data)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid data for template "${EmailTemplates.PASSWORD_RESET}"`
        )
      }
      return <PasswordResetEmail {...data} />

    case EmailTemplates.PASSWORD_RESET_CONFIRMATION:
      if (!isPasswordResetConfirmationTemplateData(data)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid data for template "${EmailTemplates.PASSWORD_RESET_CONFIRMATION}"`
        )
      }
      return <PasswordResetConfirmationEmail {...data} />

    case EmailTemplates.VENDOR_ORDER_NOTIFICATION:
      if (!isVendorOrderNotificationData(data)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid data for template "${EmailTemplates.VENDOR_ORDER_NOTIFICATION}"`
        )
      }
      return <VendorOrderNotificationTemplate {...data} />

    default:
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unknown template key: "${templateKey}"`
      )
  }
}

export { InviteUserEmail, OrderPlacedTemplate, PasswordResetEmail, PasswordResetConfirmationEmail, VendorOrderNotificationTemplate }
