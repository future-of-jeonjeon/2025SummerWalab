<template>
  <div class="workbook-edit">
    <div class="header">
      <h2>문제집 수정</h2>
    </div>

    <el-form ref="form" :model="workbook" :rules="rules" label-width="120px">
      <el-form-item label="제목" prop="title">
        <el-input v-model="workbook.title" placeholder="문제집 제목을 입력하세요"></el-input>
      </el-form-item>

      <el-form-item label="설명" prop="description">
        <el-input
          type="textarea"
          :rows="4"
          v-model="workbook.description"
          placeholder="문제집 설명을 입력하세요">
        </el-input>
      </el-form-item>

      <el-form-item label="카테고리" prop="category">
        <el-input v-model="workbook.category" placeholder="카테고리를 입력하세요"></el-input>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="updateWorkbook" :loading="loading">수정</el-button>
        <el-button @click="$router.push('/workbooks')">취소</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import api from '../../api'

export default {
  name: 'WorkbookEdit',
  data () {
    return {
      loading: false,
      workbook: {
        id: '',
        title: '',
        description: '',
        category: ''
      },
      rules: {
        title: [
          { required: true, message: '제목을 입력하세요', trigger: 'blur' }
        ]
      }
    }
  },
  mounted () {
    this.getWorkbook()
  },
  methods: {
    getWorkbook () {
      const workbookId = this.$route.params.id
      api.getWorkbook(workbookId).then(res => {
        this.workbook = res.data.data
        console.log('DEBUG: Loaded workbook:', this.workbook) // 디버깅용
      }).catch(() => {
        this.$message.error('문제집 정보를 불러올 수 없습니다')
        this.$router.push('/workbooks')
      })
    },
    updateWorkbook () {
      this.$refs.form.validate((valid) => {
        if (valid) {
          this.loading = true
          console.log('DEBUG: Sending workbook data:', this.workbook) // 디버깅용
          api.editWorkbook(this.workbook).then(() => {
            this.$message.success('문제집이 수정되었습니다')
            this.$router.push('/workbooks')
          }).catch(() => {
            this.loading = false
          })
        }
      })
    }
  }
}
</script>

<style scoped>
.workbook-edit {
  padding: 20px;
}

.header {
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
}
</style> 