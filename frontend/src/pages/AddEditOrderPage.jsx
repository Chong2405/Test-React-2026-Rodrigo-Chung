import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import apiClient from '../services/api'
import ROUTE_PATHS from '../routes/paths'

function formatDateForInput(dateValue) {
  if (!dateValue) {
    const today = new Date()
    return today.toISOString().slice(0, 10)
  }

  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toISOString().slice(0, 10)
  }

  return parsedDate.toISOString().slice(0, 10)
}

function toOrderItem(product, qty) {
  const numericQty = Number(qty)
  const unitPrice = Number(product.unit_price)

  return {
    productId: Number(product.id),
    productName: product.name,
    unitPrice,
    qty: numericQty,
    totalPrice: unitPrice * numericQty,
  }
}

function AddEditOrderPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const isEdit = useMemo(() => id && id !== 'new', [id])
  const [orderNumber, setOrderNumber] = useState('')
  const [orderDate, setOrderDate] = useState(formatDateForInput())
  const [orderStatus, setOrderStatus] = useState('Pending')
  const [orderItems, setOrderItems] = useState([])
  const [availableProducts, setAvailableProducts] = useState([])
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingItemIndex, setEditingItemIndex] = useState(null)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedQty, setSelectedQty] = useState('1')

  const isCompletedOrder = useMemo(() => orderStatus === 'Completed', [orderStatus])

  const productsCount = useMemo(
    () => orderItems.reduce((total, item) => total + Number(item.qty || 0), 0),
    [orderItems],
  )

  const finalPrice = useMemo(
    () => orderItems.reduce((total, item) => total + Number(item.totalPrice || 0), 0),
    [orderItems],
  )

  const loadPageData = useCallback(async () => {
    setIsLoadingPage(true)
    setErrorMessage('')

    try {
      const productsResponse = await apiClient.get('/products')
      setAvailableProducts(productsResponse.data)

      if (isEdit) {
        const orderResponse = await apiClient.get(`/orders/${id}`)
        const order = orderResponse.data

        setOrderNumber(order.order_number)
        setOrderDate(formatDateForInput(order.order_date))
        setOrderStatus(order.status || 'Pending')

        const mappedItems = (order.items || []).map((item) => ({
          productId: Number(item.product_id),
          productName: item.name,
          unitPrice: Number(item.unit_price),
          qty: Number(item.qty),
          totalPrice: Number(item.total_price),
        }))
        setOrderItems(mappedItems)
      }
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Failed to load order page data')
    } finally {
      setIsLoadingPage(false)
    }
  }, [id, isEdit])

  useEffect(() => {
    loadPageData()
  }, [loadPageData])

  const openAddProductModal = useCallback(() => {
    if (availableProducts.length === 0) {
      toast.warning('No products available')
      return
    }

    setEditingItemIndex(null)
    setSelectedProductId(String(availableProducts[0].id))
    setSelectedQty('1')
    setIsProductModalOpen(true)
  }, [availableProducts])

  const openEditProductModal = useCallback((itemIndex) => {
    const existingItem = orderItems[itemIndex]
    if (!existingItem) {
      return
    }

    setEditingItemIndex(itemIndex)
    setSelectedProductId(String(existingItem.productId))
    setSelectedQty(String(existingItem.qty))
    setIsProductModalOpen(true)
  }, [orderItems])

  const closeProductModal = useCallback(() => {
    setIsProductModalOpen(false)
    setEditingItemIndex(null)
    setSelectedProductId('')
    setSelectedQty('1')
  }, [])

  const handleSaveProductModal = useCallback(() => {
    const product = availableProducts.find((item) => Number(item.id) === Number(selectedProductId))
    const numericQty = Number(selectedQty)

    if (!product) {
      toast.error('Please select a product')
      return
    }

    if (!numericQty || numericQty <= 0) {
      toast.error('Qty must be greater than 0')
      return
    }

    const nextItem = toOrderItem(product, numericQty)

    setOrderItems((currentItems) => {
      if (editingItemIndex === null) {
        return [...currentItems, nextItem]
      }

      return currentItems.map((item, index) => (index === editingItemIndex ? nextItem : item))
    })

    closeProductModal()
  }, [
    availableProducts,
    closeProductModal,
    editingItemIndex,
    selectedProductId,
    selectedQty,
  ])

  const handleRemoveItem = useCallback((itemIndex) => {
    const shouldRemove = window.confirm('Are you sure you want to remove this product from the order?')
    if (!shouldRemove) {
      return
    }

    setOrderItems((currentItems) => currentItems.filter((_, index) => index !== itemIndex))
  }, [])

  const handleSaveOrder = useCallback(async () => {
    if (isCompletedOrder) {
      toast.warning('Completed orders cannot be modified')
      return
    }

    if (!orderNumber.trim()) {
      toast.error('Order # is required')
      return
    }

    if (orderItems.length === 0) {
      toast.error('At least one product is required')
      return
    }

    setIsSaving(true)
    setErrorMessage('')

    const payload = {
      orderNumber: orderNumber.trim(),
      status: orderStatus,
      items: orderItems.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        unitPrice: item.unitPrice,
      })),
    }

    try {
      if (isEdit) {
        await apiClient.put(`/orders/${id}`, payload)
        toast.success('Order updated successfully')
      } else {
        await apiClient.post('/orders', payload)
        toast.success('Order created successfully')
      }

      navigate(ROUTE_PATHS.myOrders)
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Failed to save order')
      toast.error(error.response?.data?.message || 'Failed to save order')
    } finally {
      setIsSaving(false)
    }
  }, [
    id,
    isCompletedOrder,
    isEdit,
    navigate,
    orderItems,
    orderNumber,
    orderStatus,
  ])

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-3 text-3xl font-semibold">{isEdit ? 'Edit Order' : 'Add Order'}</h1>

      {errorMessage ? <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}

      {isLoadingPage ? <p>Loading order details...</p> : null}

      {!isLoadingPage ? (
        <div className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Order #
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={orderNumber}
                  disabled={isCompletedOrder}
                  onChange={(event) => setOrderNumber(event.target.value)}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Date
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2"
                  value={orderDate}
                  disabled
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                # Products
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2"
                  value={productsCount}
                  disabled
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Final Price
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2"
                  value={finalPrice.toFixed(2)}
                  disabled
                />
              </label>
            </div>

            <div className="mt-4">
              <button
                type="button"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={isCompletedOrder}
                onClick={openAddProductModal}
              >
                Add Product
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left">ID</th>
                  <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left">Name</th>
                  <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left">Unit Price</th>
                  <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left">Qty</th>
                  <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left">Total Price</th>
                  <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left">Options</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.length === 0 ? (
                  <tr>
                    <td className="px-3 py-2 text-slate-500" colSpan={6}>
                      No products added.
                    </td>
                  </tr>
                ) : (
                  orderItems.map((item, index) => (
                    <tr key={`${item.productId}-${index}`}>
                      <td className="border-b border-slate-100 px-3 py-2">{item.productId}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{item.productName}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{item.unitPrice.toFixed(2)}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{item.qty}</td>
                      <td className="border-b border-slate-100 px-3 py-2">{item.totalPrice.toFixed(2)}</td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-md bg-blue-600 px-3 py-1 text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                            disabled={isCompletedOrder}
                            onClick={() => openEditProductModal(index)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-md bg-red-600 px-3 py-1 text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                            disabled={isCompletedOrder}
                            onClick={() => handleRemoveItem(index)}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isSaving || isCompletedOrder}
              onClick={handleSaveOrder}
            >
              {isSaving ? 'Saving...' : 'Save Order'}
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => navigate(ROUTE_PATHS.myOrders)}
            >
              Back
            </button>
          </div>
        </div>
      ) : null}

      {isProductModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-md bg-white p-5 shadow-lg">
            <h2 className="text-xl font-semibold">
              {editingItemIndex === null ? 'Add Product' : 'Edit Product'}
            </h2>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Product
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                >
                  {availableProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (${Number(product.unit_price).toFixed(2)})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Qty
                <input
                  type="number"
                  min="1"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={selectedQty}
                  onChange={(event) => setSelectedQty(event.target.value)}
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                onClick={closeProductModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700"
                onClick={handleSaveProductModal}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCompletedOrder ? (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-700">
          This order is completed and cannot be modified.
        </p>
      ) : null}
    </main>
  )
}

export default AddEditOrderPage
