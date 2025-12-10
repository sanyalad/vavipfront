import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import styles from './Auth.module.css'

const registerSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
  confirmPassword: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const { register: registerUser, registerLoading } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = (data: RegisterFormData) => {
    registerUser({
      email: data.email,
      password: data.password,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
    })
  }

  return (
    <motion.div
      className={styles.auth}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1>Регистрация</h1>
            <p>Создайте аккаунт</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.row}>
              <Input
                label="Имя"
                placeholder="Иван"
                error={errors.first_name?.message}
                {...register('first_name')}
              />
              <Input
                label="Фамилия"
                placeholder="Иванов"
                error={errors.last_name?.message}
                {...register('last_name')}
              />
            </div>
            <Input
              label="Email"
              type="email"
              placeholder="example@email.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Телефон"
              type="tel"
              placeholder="+7 (999) 123-45-67"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Input
              label="Пароль"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Подтвердите пароль"
              type="password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" fullWidth isLoading={registerLoading}>
              Зарегистрироваться
            </Button>
          </form>

          <div className={styles.footer}>
            <p>
              Уже есть аккаунт?{' '}
              <Link to="/login">Войти</Link>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}


