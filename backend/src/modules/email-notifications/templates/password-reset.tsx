import { Text, Section, Heading, Button, Hr } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'

export const PASSWORD_RESET = 'customer.password_reset'

export interface PasswordResetTemplateData {
  customer_first_name: string
  reset_token: string
  reset_url: string
  emailOptions: {
    subject: string
  }
}

export function isPasswordResetTemplateData(data: unknown): data is PasswordResetTemplateData {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return (
    typeof d.customer_first_name === 'string' &&
    typeof d.reset_token === 'string' &&
    typeof d.reset_url === 'string'
  )
}

export const PasswordResetEmail: React.FC<PasswordResetTemplateData> = ({
  customer_first_name,
  reset_url,
}) => {
  return (
    <Base preview="Reset your password">
      <Section className="mt-[32px]">
        <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
          Reset Your Password
        </Heading>
        <Text className="text-black text-[14px] leading-[24px]">
          Hi {customer_first_name || 'there'},
        </Text>
        <Text className="text-black text-[14px] leading-[24px]">
          We received a request to reset your password. Click the button below to create a new password:
        </Text>
        <Section className="text-center mt-[32px] mb-[32px]">
          <Button
            className="bg-[#000000] rounded text-white text-[14px] font-semibold no-underline text-center px-5 py-3"
            href={reset_url}
          >
            Reset Password
          </Button>
        </Section>
        <Text className="text-black text-[14px] leading-[24px]">
          Or copy and paste this URL into your browser:
        </Text>
        <Text className="text-[#666666] text-[12px] leading-[24px] break-all">
          {reset_url}
        </Text>
        <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
        <Text className="text-[#666666] text-[12px] leading-[24px]">
          This link will expire in 1 hour for security reasons.
        </Text>
        <Text className="text-[#666666] text-[12px] leading-[24px]">
          If you didn't request this password reset, you can safely ignore this email.
        </Text>
        <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
        <Text className="text-[#666666] text-[12px] leading-[24px]">
          - The Kentenbobs Team
        </Text>
      </Section>
    </Base>
  )
}

