import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import styles from './Auth.module.css'

const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login, loginLoading } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (data: LoginFormData) => {
    login(data)
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
            <h1>Вход</h1>
            <p>Войдите в свой аккаунт</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <Input
              label="Email"
              type="email"
              placeholder="example@email.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Пароль"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" fullWidth isLoading={loginLoading}>
              Войти
            </Button>
          </form>

          <div className={styles.footer}>
            <p>
              Нет аккаунта?{' '}
              <Link to="/register">Зарегистрироваться</Link>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}


