import { Modules } from '@medusajs/framework/utils'
import { INotificationModuleService, IOrderModuleService } from '@medusajs/framework/types'
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { EmailTemplates } from '../modules/email-notifications/templates'

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const notificationModuleService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve('query')
  
  // Use query.graph like the API endpoint to get the same order format
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "status",
      "display_id",
      "email",
      "customer_id",
      "currency_code",
      "total",
      "subtotal",
      "tax_total",
      "shipping_total",
      "discount_total",
      "metadata",
      "created_at",
      "items.*",
      "items.product.id",
      "items.product.title",
      "items.product.thumbnail",
      "items.variant.id",
      "items.variant.title",
      "shipping_address.*",
    ],
    filters: { id: data.id },
  })

  if (!orders?.length) {
    console.error('Order not found for email:', data.id)
    return
  }

  const order = orders[0]
  const shippingAddress = order.shipping_address

  try {
    await notificationModuleService.createNotifications({
      to: order.email,
      channel: 'email',
      template: EmailTemplates.ORDER_PLACED,
      data: {
        emailOptions: {
          replyTo: 'info@example.com',
          subject: 'Your order has been placed'
        },
        order,
        shippingAddress: shippingAddress || {
          first_name: 'Valued',
          last_name: 'Customer',
          address_1: 'Address not provided',
          country_code: 'GH'
        },
        preview: 'Thank you for your order!'
      }
    })
  } catch (error) {
    console.error('Error sending order confirmation notification:', error)
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed'
}
