import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ordersApi } from '@/services/api'
import { useCartStore } from '@/store/cartStore'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import styles from './Checkout.module.css'

const checkoutSchema = z.object({
  customer_name: z.string().min(2, 'Введите имя'),
  customer_email: z.string().email('Введите корректный email').optional().or(z.literal('')),
  customer_phone: z.string().min(10, 'Введите корректный телефон'),
  delivery_address: z.string().min(10, 'Введите адрес доставки'),
  delivery_method: z.enum(['courier', 'pickup', 'post']),
  payment_method: z.enum(['card', 'cash']),
  customer_note: z.string().optional(),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { items, totalPrice, clearCart } = useCartStore()
  const { addToast, openAuthDrawer } = useUIStore()
  const total = totalPrice()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      delivery_method: 'courier',
      payment_method: 'card',
    },
  })

  const createOrderMutation = useMutation({
    mutationFn: ordersApi.createOrder,
    onSuccess: (payload) => {
      if (payload?.access_token && payload?.refresh_token && payload?.user) {
        useAuthStore.getState().login(payload.user, payload.access_token, payload.refresh_token)
        if (payload.auto_account_created) {
          addToast({
            type: 'success',
            message: 'Аккаунт создан автоматически. Пароль будет отправлен на номер телефона.',
            duration: 5200,
          })
        }
      }
      clearCart()
      addToast({ type: 'success', message: 'Заказ успешно оформлен!' })
      navigate(`/account/orders`)
    },
    onError: (err: any) => {
      const status = err?.response?.status
      const code = err?.response?.data?.code
      if (status === 409 && code === 'PHONE_EXISTS') {
        addToast({ type: 'info', message: 'Номер уже зарегистрирован — войдите, чтобы оформить заказ.' })
        openAuthDrawer('login')
        return
      }
      addToast({ type: 'error', message: 'Ошибка при оформлении заказа' })
    },
  })

  const onSubmit = (data: CheckoutFormData) => {
    createOrderMutation.mutate({
      items: items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
      ...data,
    })
  }

  if (items.length === 0) {
    navigate('/cart')
    return null
  }

  return (
    <motion.div
      className={styles.checkout}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className={styles.container}>
        <h1 className={styles.title}>Оформление заказа</h1>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.content}>
          <div className={styles.form}>
            {/* Contact Info */}
            <section className={styles.section}>
              <h2>Контактные данные</h2>
              <p className={styles.autoAccountNote}>
                Если вы не авторизованы, аккаунт будет создан автоматически по номеру телефона.
                Пароль придёт на телефон.
              </p>
              <div className={styles.fields}>
                <Input
                  label="Имя"
                  placeholder="Иван Иванов"
                  error={errors.customer_name?.message}
                  {...register('customer_name')}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="ivan@example.com"
                  error={errors.customer_email?.message}
                  {...register('customer_email')}
                />
                <Input
                  label="Телефон"
                  type="tel"
                  placeholder="+7 (999) 123-45-67"
                  error={errors.customer_phone?.message}
                  {...register('customer_phone')}
                />
              </div>
            </section>

            {/* Delivery */}
            <section className={styles.section}>
              <h2>Доставка</h2>
              <div className={styles.radioGroup}>
                <label className={styles.radio}>
                  <input type="radio" value="courier" {...register('delivery_method')} />
                  <span className={styles.radioLabel}>
                    <strong>Курьером</strong>
                    <small>Доставка по адресу</small>
                  </span>
                </label>
                <label className={styles.radio}>
                  <input type="radio" value="pickup" {...register('delivery_method')} />
                  <span className={styles.radioLabel}>
                    <strong>Самовывоз</strong>
                    <small>Из нашего офиса</small>
                  </span>
                </label>
                <label className={styles.radio}>
                  <input type="radio" value="post" {...register('delivery_method')} />
                  <span className={styles.radioLabel}>
                    <strong>Почта России</strong>
                    <small>Доставка по всей России</small>
                  </span>
                </label>
              </div>
              <Input
                label="Адрес доставки"
                placeholder="г. Москва, ул. Примерная, д. 1, кв. 1"
                error={errors.delivery_address?.message}
                {...register('delivery_address')}
              />
            </section>

            {/* Payment */}
            <section className={styles.section}>
              <h2>Оплата</h2>
              <div className={styles.radioGroup}>
                <label className={styles.radio}>
                  <input type="radio" value="card" {...register('payment_method')} />
                  <span className={styles.radioLabel}>
                    <strong>Картой онлайн</strong>
                    <small>Visa, Mastercard, МИР</small>
                  </span>
                </label>
                <label className={styles.radio}>
                  <input type="radio" value="cash" {...register('payment_method')} />
                  <span className={styles.radioLabel}>
                    <strong>При получении</strong>
                    <small>Наличными или картой</small>
                  </span>
                </label>
              </div>
            </section>

            {/* Note */}
            <section className={styles.section}>
              <h2>Комментарий к заказу</h2>
              <textarea
                className={styles.textarea}
                placeholder="Пожелания к заказу..."
                rows={3}
                {...register('customer_note')}
              />
            </section>
          </div>

          {/* Summary */}
          <div className={styles.summary}>
            <h2>Ваш заказ</h2>
            <div className={styles.items}>
              {items.map((item) => (
                <div key={item.product.id} className={styles.item}>
                  <span className={styles.itemName}>
                    {item.product.name} × {item.quantity}
                  </span>
                  <span>
                    {(item.product.price * item.quantity).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.summaryTotal}>
              <span>Итого</span>
              <span>{total.toLocaleString('ru-RU')} ₽</span>
            </div>
            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={createOrderMutation.isPending}
            >
              Оформить заказ
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}

