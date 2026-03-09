import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import ROUTE_PATHS from '../routes/paths'
import apiClient from '../services/api'

function MyOrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isStatusUpdating, setIsStatusUpdating] = useState(false)

  const hasOrders = useMemo(() => orders.length > 0, [orders])

  const formatDate = useCallback((dateString) => {
    if (!dateString) {
      return '-'
    }

    const parsedDate = new Date(dateString)
    if (Number.isNaN(parsedDate.getTime())) {
      return '-'
    }

    return parsedDate.toLocaleDateString()
  }, [])

  const formatPrice = useCallback((value) => {
    const numericValue = Number(value || 0)
    return numericValue.toFixed(2)
  }, [])

  const loadOrders = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const response = await apiClient.get('/orders')
      setOrders(response.data)
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Failed to load orders')
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const handleDeleteOrder = useCallback(
    async (orderId, status) => {
      if (status === 'Completed') {
        toast.warning('Completed orders cannot be deleted')
        return
      }

      const shouldDelete = window.confirm('Are you sure you want to delete this order?')
      if (!shouldDelete) {
        return
      }

      try {
        await apiClient.delete(`/orders/${orderId}`)
        await loadOrders()
        toast.success('Order deleted successfully')
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete order')
      }
    },
    [loadOrders],
  )

  const handleChangeStatus = useCallback(
    async (orderId, status) => {
      setIsStatusUpdating(true)
      try {
        await apiClient.patch(`/orders/${orderId}/status`, { status })
        await loadOrders()
        toast.success('Order status updated')
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to update status')
      } finally {
        setIsStatusUpdating(false)
      }
    },
    [loadOrders],
  )

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-4 text-3xl font-semibold">My Orders</h1>

      <div className="mb-4">
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            onClick={() => navigate(ROUTE_PATHS.addOrder)}
          >
            Add New Order
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={() => navigate(ROUTE_PATHS.products)}
          >
            Products
          </button>
        </div>
      </div>

      {errorMessage ? <p className="mb-3 font-medium text-red-600">{errorMessage}</p> : null}

      {isLoading ? <p>Loading orders...</p> : null}

      {!isLoading && !hasOrders ? <p>No orders found.</p> : null}

      {!isLoading && hasOrders ? (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left">ID</th>
                <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left">Order #</th>
                <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left">Date</th>
                <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left"># Products</th>
                <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left">Final Price</th>
                <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left">Status</th>
                <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left">Options</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="border-b border-slate-100 px-3 py-2">{order.id}</td>
                  <td className="border-b border-slate-100 px-3 py-2">{order.order_number}</td>
                  <td className="border-b border-slate-100 px-3 py-2">{formatDate(order.order_date)}</td>
                  <td className="border-b border-slate-100 px-3 py-2">{order.products_count}</td>
                  <td className="border-b border-slate-100 px-3 py-2">{formatPrice(order.final_price)}</td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    <select
                      className="rounded-md border border-slate-300 px-2 py-1"
                      value={order.status}
                      disabled={isStatusUpdating || order.status === 'Completed'}
                      onChange={(event) => handleChangeStatus(order.id, event.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="InProgress">InProgress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-blue-600 px-3 py-1 text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={order.status === 'Completed'}
                      onClick={() => navigate(`/add-order/${order.id}`)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-red-600 px-3 py-1 text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={order.status === 'Completed'}
                      onClick={() => handleDeleteOrder(order.id, order.status)}
                    >
                      Delete
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  )
}

export default MyOrdersPage
