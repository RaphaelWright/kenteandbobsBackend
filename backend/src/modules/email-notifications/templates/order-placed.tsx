import { Text, Section, Hr } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'
import { OrderDTO, OrderAddressDTO } from '@medusajs/framework/types'

export const ORDER_PLACED = 'order-placed'

interface OrderPlacedPreviewProps {
  order: OrderDTO & { display_id: string; summary: { raw_current_order_total: { value: number } } }
  shippingAddress: OrderAddressDTO
}

export interface OrderPlacedTemplateProps {
  order: OrderDTO & { display_id: string; summary: { raw_current_order_total: { value: number } } }
  shippingAddress: OrderAddressDTO
  preview?: string
}

export const isOrderPlacedTemplateData = (data: any): data is OrderPlacedTemplateProps =>
  typeof data === 'object' && 
  typeof data.order === 'object' && 
  data.order !== null &&
  typeof data.shippingAddress === 'object' &&
  data.shippingAddress !== null

export const OrderPlacedTemplate: React.FC<OrderPlacedTemplateProps> & {
  PreviewProps: OrderPlacedPreviewProps
} = ({ order, shippingAddress, preview = 'Your order has been placed!' }) => {
  // Safely access order properties with fallbacks
  const orderDisplayId = order.display_id || order.id || 'N/A';
  const orderTotal = order.summary?.raw_current_order_total?.value || order.total || 0;
  const orderCurrency = order.currency_code || 'GHS';
  const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString() : new Date().toLocaleDateString();
  const orderItems = order.items || [];
  
  return (
    <Base preview={preview}>
      <Section>
        <Text style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', margin: '0 0 30px' }}>
          Order Confirmation
        </Text>

        <Text style={{ margin: '0 0 15px' }}>
          Dear {shippingAddress?.first_name || 'Customer'} {shippingAddress?.last_name || ''},
        </Text>

        <Text style={{ margin: '0 0 30px' }}>
          Thank you for your recent order! Here are your order details:
        </Text>

        <Text style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px' }}>
          Order Summary
        </Text>
        <Text style={{ margin: '0 0 5px' }}>
          Order ID: {orderDisplayId}
        </Text>
        <Text style={{ margin: '0 0 5px' }}>
          Order Date: {orderDate}
        </Text>
        <Text style={{ margin: '0 0 20px' }}>
          Total: {orderCurrency.toUpperCase()} {typeof orderTotal === 'number' ? orderTotal.toFixed(2) : Number(orderTotal).toFixed(2)}
        </Text>

        <Hr style={{ margin: '20px 0' }} />

        {shippingAddress?.address_1 && (
          <>
            <Text style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px' }}>
              Shipping Address
            </Text>
            <Text style={{ margin: '0 0 5px' }}>
              {String(shippingAddress.address_1 || '')}
            </Text>
            {(shippingAddress.city || shippingAddress.province || shippingAddress.postal_code) && (
              <Text style={{ margin: '0 0 5px' }}>
                {String(shippingAddress.city || '')}{shippingAddress.city && shippingAddress.province ? ', ' : ''}{String(shippingAddress.province || '')} {String(shippingAddress.postal_code || '')}
              </Text>
            )}
            {shippingAddress.country_code && (
              <Text style={{ margin: '0 0 20px' }}>
                {String(shippingAddress.country_code || '')}
              </Text>
            )}
            <Hr style={{ margin: '20px 0' }} />
          </>
        )}

        {orderItems.length > 0 && (
          <Section style={{ margin: '20px 0' }}>
            <Text style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 15px' }}>
              Order Items
            </Text>

            {orderItems.map((item: any) => (
              <Section key={item?.id || Math.random()} style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px', marginBottom: '10px' }}>
                <Text style={{ margin: '5px 0', fontWeight: 'bold' }}>
                  {String(item?.title || item?.product_title || 'Item')}{item?.subtitle ? ` - ${String(item.subtitle)}` : ''}
                </Text>
                <Text style={{ margin: '5px 0' }}>
                  Quantity: {String(item?.quantity || 1)}
                </Text>
                <Text style={{ margin: '5px 0' }}>
                  Price: {orderCurrency.toUpperCase()} {String(Number(item?.unit_price || 0).toFixed(2))}
                </Text>
              </Section>
            ))}
          </Section>
        )}

        <Hr style={{ margin: '20px 0' }} />

        <Text style={{ margin: '20px 0', color: '#666666', fontSize: '14px' }}>
          Thank you for shopping with Kentenbobs! We appreciate your business.
        </Text>
      </Section>
    </Base>
  )
}

OrderPlacedTemplate.PreviewProps = {
  order: {
    id: 'test-order-id',
    display_id: 'ORD-123',
    created_at: new Date().toISOString(),
    email: 'test@example.com',
    currency_code: 'USD',
    items: [
      { id: 'item-1', title: 'Item 1', product_title: 'Product 1', quantity: 2, unit_price: 10 },
      { id: 'item-2', title: 'Item 2', product_title: 'Product 2', quantity: 1, unit_price: 25 }
    ],
    shipping_address: {
      first_name: 'Test',
      last_name: 'User',
      address_1: '123 Main St',
      city: 'Anytown',
      province: 'CA',
      postal_code: '12345',
      country_code: 'US'
    },
    summary: { raw_current_order_total: { value: 45 } }
  },
  shippingAddress: {
    first_name: 'Test',
    last_name: 'User',
    address_1: '123 Main St',
    city: 'Anytown',
    province: 'CA',
    postal_code: '12345',
    country_code: 'US'
  }
} as OrderPlacedPreviewProps

export default OrderPlacedTemplate
