import { Text, Section, Hr, Img } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'
import { OrderDTO } from '@medusajs/framework/types'

export const VENDOR_ORDER_NOTIFICATION = 'vendor-order-notification'

interface VendorOrderNotificationProps {
  order: OrderDTO & { display_id: string; summary?: { raw_current_order_total?: { value: number } } }
  customerName: string
  customerEmail: string
  itemsCount: number
  preview?: string
}

export const isVendorOrderNotificationData = (data: any): data is VendorOrderNotificationProps =>
  typeof data === 'object' &&
  data !== null &&
  typeof data.order === 'object' &&
  data.order !== null &&
  typeof data.customerName === 'string' &&
  typeof data.customerEmail === 'string' &&
  typeof data.itemsCount === 'number'

export const VendorOrderNotificationTemplate: React.FC<VendorOrderNotificationProps> & {
  PreviewProps: VendorOrderNotificationProps
} = ({ order, customerName, customerEmail, itemsCount, preview = 'New Order Alert' }) => {
  // Safely access order properties with fallbacks
  const orderDisplayId = order.display_id || order.id || 'N/A'
  const orderDate = order.created_at 
    ? new Date(order.created_at).toLocaleDateString() 
    : new Date().toLocaleDateString()

  return (
    <Base preview={preview}>
      <Section>
        <Text style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', margin: '0 0 30px', color: '#d32f2f' }}>
          🔔 New Order Alert
        </Text>

        <Text style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 'bold' }}>
          You have a new order to attend to!
        </Text>

        <Hr style={{ margin: '20px 0' }} />

        <Text style={{ fontSize: '18px', fontWeight: 'bold', margin: '20px 0 10px' }}>
          Order Details
        </Text>

        <Text style={{ margin: '0 0 5px' }}>
          <strong>Order ID:</strong> {String(orderDisplayId)}
        </Text>
        <Text style={{ margin: '0 0 5px' }}>
          <strong>Order Date:</strong> {String(orderDate)}
        </Text>
        <Text style={{ margin: '0 0 5px' }}>
          <strong>Total Amount:</strong> {String(order.total || 0)}
        </Text>
        <Text style={{ margin: '0 0 20px' }}>
          <strong>Number of Items:</strong> {String(itemsCount)}
        </Text>

        <Hr style={{ margin: '20px 0' }} />

        <Text style={{ fontSize: '18px', fontWeight: 'bold', margin: '20px 0 15px' }}>
          Products Ordered
        </Text>

        {order.items && order.items.length > 0 ? (
          order.items.map((item: any) => (
            <Section key={item?.id || Math.random()} style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
              {item?.thumbnail && (
                <div style={{ marginBottom: '10px' }}>
                  <Img
                    src={String(item.thumbnail)}
                    alt={String(item?.title || 'Product')}
                    style={{ maxWidth: '150px', height: 'auto', borderRadius: '4px' }}
                  />
                </div>
              )}
              <Text style={{ margin: '0 0 5px', fontWeight: 'bold', fontSize: '16px', color: '#333' }}>
                {String(item?.title || 'Product')}
              </Text>
              {item?.subtitle && (
                <Text style={{ margin: '0 0 5px', fontSize: '14px', color: '#666' }}>
                  {String(item.subtitle)}
                </Text>
              )}
              <Text style={{ margin: '0 0 5px', fontSize: '14px' }}>
                Quantity: {String(item?.quantity || 1)}
              </Text>
              <Text style={{ margin: '0 0 5px', fontSize: '14px' }}>
                Price: {String(item?.unit_price || 0)}
              </Text>
            </Section>
          ))
        ) : (
          <Text style={{ margin: '0 0 20px', color: '#666' }}>
            No items in this order
          </Text>
        )}

        <Hr style={{ margin: '20px 0' }} />

        <Text style={{ fontSize: '18px', fontWeight: 'bold', margin: '20px 0 10px' }}>
          Customer Information
        </Text>

        <Text style={{ margin: '0 0 5px' }}>
          <strong>Customer Name:</strong> {String(customerName || 'N/A')}
        </Text>
        <Text style={{ margin: '0 0 20px' }}>
          <strong>Customer Email:</strong> {String(customerEmail || 'N/A')}
        </Text>

        <Hr style={{ margin: '20px 0' }} />

        <Text style={{ margin: '20px 0', color: '#d32f2f', fontSize: '14px', fontWeight: 'bold' }}>
          Please log in to your admin dashboard to view the full order details and begin processing this order.
        </Text>

        <Text style={{ margin: '20px 0', color: '#666666', fontSize: '12px' }}>
          This is an automated notification from Kentenbobs. Please do not reply to this email.
        </Text>
      </Section>
    </Base>
  )
}

VendorOrderNotificationTemplate.PreviewProps = {
  order: {
    id: 'order_test123',
    display_id: 'ORD-001',
    created_at: new Date().toISOString(),
    email: 'customer@example.com',
    currency_code: 'GHS',
    items: [
      { id: 'item-1', title: 'Product 1', quantity: 2 },
      { id: 'item-2', title: 'Product 2', quantity: 1 }
    ],
    summary: { raw_current_order_total: { value: 150 } }
  } as any,
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  itemsCount: 2,
  preview: 'New Order Alert'
} as VendorOrderNotificationProps

export default VendorOrderNotificationTemplate
