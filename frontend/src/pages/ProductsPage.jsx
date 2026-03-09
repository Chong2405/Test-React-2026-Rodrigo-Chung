import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import apiClient from '../services/api'
import ROUTE_PATHS from '../routes/paths'

function ProductsPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const [editingProductId, setEditingProductId] = useState(null)
  const [nameInput, setNameInput] = useState('')
  const [unitPriceInput, setUnitPriceInput] = useState('')

  const isEditing = useMemo(() => editingProductId !== null, [editingProductId])

  const resetForm = useCallback(() => {
    setEditingProductId(null)
    setNameInput('')
    setUnitPriceInput('')
  }, [])

  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const response = await apiClient.get('/products')
      setProducts(response.data)
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Failed to load products')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleStartEdit = useCallback((product) => {
    setEditingProductId(product.id)
    setNameInput(product.name)
    setUnitPriceInput(String(Number(product.unit_price)))
  }, [])

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault()

      const trimmedName = nameInput.trim()
      const parsedUnitPrice = Number(unitPriceInput)

      if (!trimmedName) {
        toast.error('Name is required')
        return
      }

      if (!parsedUnitPrice || parsedUnitPrice <= 0) {
        toast.error('Unit Price must be greater than 0')
        return
      }

      try {
        if (isEditing) {
          await apiClient.put(`/products/${editingProductId}`, {
            name: trimmedName,
            unitPrice: parsedUnitPrice,
          })
          toast.success('Product updated successfully')
        } else {
          await apiClient.post('/products', {
            name: trimmedName,
            unitPrice: parsedUnitPrice,
          })
          toast.success('Product created successfully')
        }

        resetForm()
        await loadProducts()
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to save product')
      }
    },
    [editingProductId, isEditing, loadProducts, nameInput, resetForm, unitPriceInput],
  )

  const handleDelete = useCallback(
    async (productId) => {
      const shouldDelete = window.confirm('Are you sure you want to delete this product?')
      if (!shouldDelete) {
        return
      }

      try {
        await apiClient.delete(`/products/${productId}`)
        await loadProducts()
        toast.success('Product deleted successfully')
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete product')
      }
    },
    [loadProducts],
  )

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-3xl font-semibold">Products</h1>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          onClick={() => navigate(ROUTE_PATHS.myOrders)}
        >
          Back to My Orders
        </button>
      </div>

      <form
        className="mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={handleSubmit}
      >
        <h2 className="mb-3 text-lg font-semibold">{isEditing ? 'Edit Product' : 'Add Product'}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">
            Name
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Unit Price
            <input
              type="number"
              min="0"
              step="0.01"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              value={unitPriceInput}
              onChange={(event) => setUnitPriceInput(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            {isEditing ? 'Update Product' : 'Create Product'}
          </button>
          {isEditing ? (
            <button
              type="button"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={resetForm}
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      {errorMessage ? <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
      {isLoading ? <p>Loading products...</p> : null}

      {!isLoading ? (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left">ID</th>
                <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left">Name</th>
                <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left">Unit Price</th>
                <th className="border-b border-slate-200 bg-slate-100 px-3 py-2 text-left">Options</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="border-b border-slate-100 px-3 py-2">{product.id}</td>
                  <td className="border-b border-slate-100 px-3 py-2">{product.name}</td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    {Number(product.unit_price).toFixed(2)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-md bg-blue-600 px-3 py-1 text-white"
                        onClick={() => handleStartEdit(product)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-md bg-red-600 px-3 py-1 text-white"
                        onClick={() => handleDelete(product.id)}
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

export default ProductsPage
