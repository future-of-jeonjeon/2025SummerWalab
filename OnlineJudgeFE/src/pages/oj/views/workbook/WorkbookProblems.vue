<template>
  <div class="workbook-problems">
    <Panel shadow>
      <div slot="title">
        <span>{{ workbook.title }}</span>
        <span v-if="workbook.description" class="workbook-description"> - {{ workbook.description }}</span>
      </div>
      <div slot="extra">
        <ul class="filter">
          <li>
            <Dropdown @on-click="filterByDifficulty">
              <span>{{query.difficulty === '' ? this.$i18n.t('m.Difficulty') : this.$i18n.t('m.' + query.difficulty)}}
                <Icon type="arrow-down-b"></Icon>
              </span>
              <Dropdown-menu slot="list">
                <Dropdown-item name="">{{$t('m.All')}}</Dropdown-item>
                <Dropdown-item name="Low">{{$t('m.Low')}}</Dropdown-item>
                <Dropdown-item name="Mid" >{{$t('m.Mid')}}</Dropdown-item>
                <Dropdown-item name="High">{{$t('m.High')}}</Dropdown-item>
              </Dropdown-menu>
            </Dropdown>
          </li>
          <li>
            <Input v-model="query.keyword"
                   @on-enter="filterByKeyword"
                   @on-click="filterByKeyword"
                   placeholder="keyword"
                   icon="ios-search-strong"/>
          </li>
          <li>
            <Button type="info" @click="onReset">
              <Icon type="refresh"></Icon>
              {{ $t('m.Reset') }}
            </Button>
          </li>
        </ul>
      </div>
      <Table style="width: 100%; font-size: 16px;"
             :columns="problemTableColumns"
             :data="problemList"
             :loading="loadings.table"
             disabled-hover></Table>
    </Panel>
    <Pagination
      :total="total" 
      :page-size.sync="query.limit" 
      @on-change="pushRouter" 
      @on-page-size-change="pushRouter" 
      :current.sync="query.page" 
      :show-sizer="true">
    </Pagination>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import api from '@oj/api'
import utils from '@/utils/utils'
import { ProblemMixin } from '@oj/components/mixins'
import Pagination from '@oj/components/Pagination'

export default {
  name: 'WorkbookProblems',
  mixins: [ProblemMixin],
  components: {
    Pagination
  },
  data () {
    return {
      workbook: {
        id: null,
        title: '',
        description: ''
      },
      problemTableColumns: [
        {
          title: '#',
          key: '_id',
          width: 80,
          render: (h, params) => {
            return h('Button', {
              props: {
                type: 'text',
                size: 'large'
              },
              on: {
                click: () => {
                  this.$router.push({name: 'problem-details', params: {problemID: params.row._id}})
                }
              },
              style: {
                padding: '2px 0'
              }
            }, params.row._id)
          }
        },
        {
          title: this.$i18n.t('m.Title'),
          width: 400,
          render: (h, params) => {
            return h('Button', {
              props: {
                type: 'text',
                size: 'large'
              },
              on: {
                click: () => {
                  this.$router.push({name: 'problem-details', params: {problemID: params.row._id}})
                }
              },
              style: {
                padding: '2px 0',
                overflowX: 'auto',
                textAlign: 'left',
                width: '100%'
              }
            }, params.row.title)
          }
        },
        {
          title: this.$i18n.t('m.Level'),
          render: (h, params) => {
            let t = params.row.difficulty
            let color = 'blue'
            if (t === 'Low') color = 'green'
            else if (t === 'High') color = 'yellow'
            return h('Tag', {
              props: {
                color: color
              }
            }, this.$i18n.t('m.' + params.row.difficulty))
          }
        },
        {
          title: this.$i18n.t('m.Total'),
          key: 'submission_number'
        },
        {
          title: this.$i18n.t('m.AC_Rate'),
          render: (h, params) => {
            return h('span', this.getACRate(params.row.accepted_number, params.row.submission_number))
          }
        }
      ],
      problemList: [],
      total: 0,
      loadings: {
        table: true
      },
      query: {
        keyword: '',
        difficulty: '',
        page: 1,
        limit: 10
      }
    }
  },
  mounted () {
    this.init()
  },
  methods: {
    init (simulate = false) {
      this.workbook.id = this.$route.params.workbookID
      let query = this.$route.query
      this.query.difficulty = query.difficulty || ''
      this.query.keyword = query.keyword || ''
      this.query.page = parseInt(query.page) || 1
      if (this.query.page < 1) {
        this.query.page = 1
      }
      this.query.limit = parseInt(query.limit) || 10
      this.getWorkbookInfo()
      this.getProblemList()
    },
    pushRouter () {
      this.$router.push({
        name: 'workbook-problems',
        params: { workbookID: this.workbook.id },
        query: utils.filterEmptyValue(this.query)
      })
    },
    getWorkbookInfo () {
      api.getWorkbook(this.workbook.id).then(res => {
        this.workbook = res.data.data
      })
    },
    getProblemList () {
      let offset = (this.query.page - 1) * this.query.limit
      this.loadings.table = true
      
      // 문제집 ID를 포함한 쿼리 파라미터 생성
      let searchParams = {
        ...this.query,
        workbook: this.workbook.id
      }
      
      api.getProblemList(offset, this.query.limit, searchParams).then(res => {
        this.loadings.table = false
        this.total = res.data.data.total
        this.problemList = res.data.data.results
        if (this.isAuthenticated) {
          this.addStatusColumn(this.problemTableColumns, res.data.data.results)
        }
      }, res => {
        this.loadings.table = false
      })
    },
    filterByDifficulty (difficulty) {
      this.query.difficulty = difficulty
      this.query.page = 1
      this.pushRouter()
    },
    filterByKeyword () {
      this.query.page = 1
      this.pushRouter()
    },
    onReset () {
      this.$router.push({
        name: 'workbook-problems',
        params: { workbookID: this.workbook.id }
      })
    }
  },
  computed: {
    ...mapGetters(['isAuthenticated'])
  },
  watch: {
    '$route' (newVal, oldVal) {
      if (newVal !== oldVal) {
        this.init(true)
      }
    },
    'isAuthenticated' (newVal) {
      if (newVal === true) {
        this.init()
      }
    }
  }
}
</script>

<style scoped>
.workbook-problems {
  padding: 20px;
}

.workbook-description {
  color: #666;
  font-size: 14px;
}

.filter {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
}

.filter li {
  margin-right: 10px;
}

.filter li:last-child {
  margin-right: 0;
}
</style> 