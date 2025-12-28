import { Text, Section, Heading, Hr } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'

export const PASSWORD_RESET_CONFIRMATION = 'customer.password_reset_confirmation'

export interface PasswordResetConfirmationTemplateData {
  customer_first_name: string
  reset_timestamp: string
  emailOptions: {
    subject: string
  }
}

export function isPasswordResetConfirmationTemplateData(
  data: unknown
): data is PasswordResetConfirmationTemplateData {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (
    typeof d.customer_first_name === 'string' &&
    typeof d.reset_timestamp === 'string'
  )
}

export const PasswordResetConfirmationEmail: React.FC<PasswordResetConfirmationTemplateData> = ({
  customer_first_name,
  reset_timestamp,
}) => {
  return (
    <Base preview="Your password has been reset">
      <Section className="mt-[32px]">
        <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
          Password Reset Successful
        </Heading>
        <Text className="text-black text-[14px] leading-[24px]">
          Hi {customer_first_name || 'there'},
        </Text>
        <Text className="text-black text-[14px] leading-[24px]">
          Your password has been successfully reset at {reset_timestamp}.
        </Text>
        <Text className="text-black text-[14px] leading-[24px]">
          You can now log in to your account using your new password.
        </Text>
        <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
        <Text className="text-[#666666] text-[12px] leading-[24px]">
          <strong>Security Notice:</strong> If you didn't make this change, please contact our support team immediately.
        </Text>
        <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
        <Text className="text-[#666666] text-[12px] leading-[24px]">
          - The Kentenbobs Team
        </Text>
      </Section>
    </Base>
  )
}

