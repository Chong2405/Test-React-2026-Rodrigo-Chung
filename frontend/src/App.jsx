import { Navigate, Route, Routes } from 'react-router-dom'
import MyOrdersPage from './pages/MyOrdersPage'
import AddEditOrderPage from './pages/AddEditOrderPage'
import ProductsPage from './pages/ProductsPage'
import ROUTE_PATHS from './routes/paths'

function App() {
  return (
    <Routes>
      <Route
        path={ROUTE_PATHS.root}
        element={<Navigate to={ROUTE_PATHS.myOrders} replace />}
      />
      <Route path={ROUTE_PATHS.myOrders} element={<MyOrdersPage />} />
      <Route path={ROUTE_PATHS.addEditOrder} element={<AddEditOrderPage />} />
      <Route path={ROUTE_PATHS.products} element={<ProductsPage />} />
      <Route
        path="*"
        element={<Navigate to={ROUTE_PATHS.myOrders} replace />}
      />
    </Routes>
  )
}

export default App
